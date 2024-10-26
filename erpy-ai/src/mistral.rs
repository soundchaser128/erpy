use std::{
    cell::LazyCell,
    num::NonZero,
    sync::{Arc, LazyLock},
};

use super::{
    CompletionApi, CompletionRequest, CompletionResponse, DeltaContent, MessageHistoryItem,
    StreamingCompletionChoice, StreamingCompletionResponse,
};
use anyhow::Result;
use camino::{Utf8Component, Utf8Path, Utf8PathBuf};
use either::Either;
use indexmap::IndexMap;

use mistralrs::{
    best_device, ChatCompletionChunkResponse, Constraint, DefaultSchedulerMethod,
    DeviceMapMetadata, GGUFLoaderBuilder, GGUFSpecificConfig, MistralRs, MistralRsBuilder,
    ModelDType, NormalRequest, Request, RequestMessage, Response, SamplingParams, SchedulerConfig,
    TokenSource,
};
use tokio::sync::mpsc::Receiver;
use tokio_stream::{Stream, StreamExt};

#[derive(Clone)]
pub struct MistralRsCompletions {
    runner: Arc<MistralRs>,
    model_id: String,
    file_name: String,
}

impl MistralRsCompletions {
    pub async fn new(
        model_id: String,
        chat_template: Option<String>,
        files: Vec<String>,
    ) -> Result<Self> {
        let config = GGUFSpecificConfig {
            prompt_batchsize: None,
            topology: None,
        };
        let file_name = files[0].clone();
        let loader =
            GGUFLoaderBuilder::new(chat_template, None, model_id.clone(), files, config).build();

        // let paged_attn_cfg = if cfg!(not(target_os = "macos")) {
        //     Some(PagedAttentionMetaBuilder::default().build()?)
        // } else {
        //     None
        // };
        let paged_attn_cfg = None;

        let device = &best_device(false)?;
        println!("Using device: {:?}", device);

        // Load, into a Pipeline
        let pipeline = loader.load_model_from_hf(
            None,
            TokenSource::CacheToken,
            &ModelDType::Auto,
            device,
            false,
            DeviceMapMetadata::dummy(),
            None,
            paged_attn_cfg,
        )?;

        let scheduler_method = SchedulerConfig::DefaultScheduler {
            method: DefaultSchedulerMethod::Fixed(NonZero::new(32).unwrap()),
        };

        let runner = MistralRsBuilder::new(pipeline, scheduler_method)
            .with_no_kv_cache(false)
            .with_gemm_full_precision_f16(true)
            .with_no_prefix_cache(false)
            .with_prefix_cache_n(16)
            .with_log("info".into())
            .build();

        Ok(Self {
            runner,
            model_id,
            file_name,
        })
    }

    pub async fn completions_receiver(
        &self,
        request: &CompletionRequest,
    ) -> Result<Receiver<Response>> {
        use tokio::sync::mpsc::channel;

        let (tx, rx) = channel(10_000);
        let id = self.runner.next_request_id();
        let request = Request::Normal(NormalRequest {
            id,
            messages: convert_messages(&request.messages),
            sampling_params: SamplingParams {
                temperature: request.temperature,
                top_k: None,
                top_p: request.top_p,
                min_p: None,
                top_n_logprobs: 1,
                frequency_penalty: request.frequency_penalty,
                presence_penalty: request.presence_penalty,
                max_len: request.max_tokens,
                stop_toks: None,
                logits_bias: None,
                n_choices: 1,
                dry_params: None,
            },
            response: tx,
            return_logprobs: false,
            is_streaming: true,
            constraint: Constraint::None,
            suffix: None,
            adapters: None,
            tools: None,
            tool_choice: None,
            logits_processors: None,
        });

        let sender = self.runner.get_sender().unwrap();
        sender.send(request).await?;

        Ok(rx)
    }
}

fn convert_messages(items: &[MessageHistoryItem]) -> RequestMessage {
    let mut messages = vec![];

    for message in items {
        let mut message_map = IndexMap::new();
        message_map.insert("role".to_string(), Either::Left(message.role.to_string()));
        message_map.insert(
            "content".to_string(),
            Either::Left(message.content.to_string()),
        );
        messages.push(message_map);
    }

    RequestMessage::Chat(messages)
}

impl From<ChatCompletionChunkResponse> for StreamingCompletionResponse {
    fn from(chunk: ChatCompletionChunkResponse) -> Self {
        let choices = chunk
            .choices
            .into_iter()
            .map(|c| StreamingCompletionChoice {
                delta: DeltaContent {
                    content: c.delta.content,
                },
            });

        Self {
            choices: choices.collect(),
        }
    }
}

impl CompletionApi for MistralRsCompletions {
    async fn get_completions_stream(
        &self,
        request: &CompletionRequest,
    ) -> Result<impl Stream<Item = StreamingCompletionResponse>> {
        let rx = self.completions_receiver(request).await?;
        let stream = tokio_stream::wrappers::ReceiverStream::new(rx);

        Ok(stream.map_while(|response| match response {
            Response::Chunk(chunk) => {
                let is_finished = chunk.choices.iter().all(|x| x.finish_reason.is_some());
                log::debug!("got chunk: {:#?}", chunk);
                if is_finished {
                    None
                } else {
                    Some(chunk.into())
                }
            }
            Response::InternalError(error) => {
                log::error!("internal error: {:#?}", error);
                None
            }
            Response::ValidationError(error) => {
                log::error!("validation error: {:#?}", error);
                None
            }
            Response::ModelError(e, _) => {
                log::error!("model error: {:#?}", e);
                None
            }
            Response::Done(_) => None,
            Response::CompletionModelError(_, _) => None,
            Response::CompletionDone(_) => None,
            Response::CompletionChunk(_) => None,
            Response::ImageGeneration(_) => None,
        }))
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec![self.model_id.clone()])
    }

    async fn get_completions(&self, request: &CompletionRequest) -> Result<CompletionResponse> {
        todo!()
    }
}

#[derive(Debug)]
pub struct ModelInfo {
    pub user: String,
    pub name: String,
    pub path: Utf8PathBuf,
}

fn find_models_path_segment(path: &Utf8Path) -> Option<&str> {
    path.components()
        .filter_map(|c| {
            if let Utf8Component::Normal(s) = c {
                if s.starts_with("models--") {
                    return Some(s);
                }
            }
            None
        })
        .next()
}

fn find_huggingface_models(home: &Utf8Path) -> Result<Vec<ModelInfo>> {
    use regex::Regex;
    use walkdir::WalkDir;

    const HUGGINGFACE_CACHE_DIR: &str = ".cache/huggingface/hub";
    static HF_MODEL_REGEX: LazyLock<Regex> =
        LazyLock::new(|| Regex::new("models--(.*)--(.*)").unwrap());

    let hf_directory = home.join(HUGGINGFACE_CACHE_DIR);
    let mut models = vec![];

    for entry in WalkDir::new(hf_directory).follow_links(false) {
        let path = Utf8PathBuf::from_path_buf(entry?.into_path()).unwrap();
        if path.extension() == Some("gguf") {
            if let Some(parent) = find_models_path_segment(&path) {
                let caps = HF_MODEL_REGEX.captures(parent);
                if let Some(captures) = caps {
                    let user = captures.get(1);
                    let name = captures.get(2);
                    if let (Some(user), Some(name)) = (user, name) {
                        models.push(ModelInfo {
                            user: user.as_str().to_string(),
                            name: name.as_str().to_string(),
                            path,
                        });
                    }
                }
            }
        }
    }

    Ok(models)
}

fn find_lm_studio_models(home: &Utf8Path) -> Result<Vec<ModelInfo>> {
    use walkdir::WalkDir;

    const LM_STUDIO_CACHE_DIR: &str = ".cache/lm-studio/models";

    let directory = home.join(LM_STUDIO_CACHE_DIR);
    let mut models = vec![];

    for entry in WalkDir::new(directory) {
        let path = Utf8PathBuf::from_path_buf(entry?.into_path()).unwrap();
        if path.extension() == Some("gguf") {
            let Some(model_name) = path.parent().and_then(|p| p.file_name()) else {
                continue;
            };

            let Some(user) = path
                .parent()
                .and_then(|p| p.parent())
                .and_then(|p| p.file_name())
            else {
                continue;
            };

            models.push(ModelInfo {
                user: user.to_string(),
                name: model_name.to_string(),
                path,
            });
        }
    }

    Ok(models)
}

pub fn list_models_on_disk() -> Result<Vec<ModelInfo>> {
    let mut models = vec![];
    let home = Utf8PathBuf::from_path_buf(dirs::home_dir().expect("could not find home directory"))
        .unwrap();

    let hf_models = find_huggingface_models(&home)?;
    models.extend(hf_models);

    let lm_studio_models = find_lm_studio_models(&home)?;
    models.extend(lm_studio_models);

    Ok(models)
}

#[cfg(test)]
mod tests {
    use crate::{
        mistral::MistralRsCompletions, CompletionApi, CompletionRequest, MessageHistoryItem,
        MessageRole,
    };
    use tokio_stream::StreamExt;

    use super::list_models_on_disk;

    #[tokio::test]
    async fn test_streaming_completions() {
        let mistral = MistralRsCompletions::new(
            "bartowski/Meta-Llama-3.1-8B-Instruct-GGUF".into(),
            Some("../chat_templates/llama3.json".into()),
            vec!["Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf".into()],
        )
        .await
        .expect("failed to setup mistral.rs");

        let request = CompletionRequest {
            messages: vec![
                MessageHistoryItem {
                    role: MessageRole::System,
                    content: "You're a helpful assistant".into(),
                },
                MessageHistoryItem {
                    role: MessageRole::User,
                    content: "What is a cargo plane?".into(),
                },
            ],
            model: "ignore".into(),
            max_tokens: Some(400),
            stream: true,
            temperature: Some(0.7),
            frequency_penalty: None,
            presence_penalty: None,
            repeat_penalty: None,
            top_p: None,
            seed: None,
        };

        let mut stream = mistral.get_completions_stream(&request).await.unwrap();
        while let Some(response) = stream.next().await {
            println!("{:#?}", response);
        }
    }

    #[test]
    fn test_list_models() {
        let models = list_models_on_disk().expect("failed to list models");
        for model in models {
            println!("{:#?}", model);
        }
    }
}
