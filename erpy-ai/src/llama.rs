use crate::{CompletionApi, CompletionRequest, CompletionResponse, StreamingCompletionResponse};
use anyhow::{Context, Result};
use camino::Utf8PathBuf;
use hf_hub::api::tokio::ApiBuilder;
use llama_cpp_2::llama_backend::LlamaBackend;
use tokio_stream::Stream;

pub struct LlamaCppCompletions {
    // tODO
    model_id: String,
}

impl LlamaCppCompletions {
    pub async fn new(model_id: String, chat_template: String, files: Vec<String>) -> Result<Self> {
        Ok(Self { model_id })
    }
}

impl CompletionApi for LlamaCppCompletions {
    async fn get_completions_stream(
        &self,
        request: &CompletionRequest,
    ) -> Result<impl Stream<Item = StreamingCompletionResponse>> {
        Ok(tokio_stream::empty())
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        Ok(vec![self.model_id.clone()])
    }

    async fn get_completions(&self, request: &CompletionRequest) -> Result<CompletionResponse> {
        todo!()
    }
}

#[derive(Debug, Clone)]
enum Model {
    /// Use an already downloaded model
    Local {
        /// The path to the model. e.g. `/home/marcus/.cache/huggingface/hub/models--TheBloke--Llama-2-7B-Chat-GGUF/blobs/08a5566d61d7cb6b420c3e4387a39e0078e1f2fe5f055f3a03887385304d4bfa`
        path: Utf8PathBuf,
    },
    /// Download a model from huggingface (or use a cached version)
    HuggingFace {
        /// the repo containing the model. e.g. `TheBloke/Llama-2-7B-Chat-GGUF`
        repo: String,
        /// the model name. e.g. `llama-2-7b-chat.Q4_K_M.gguf`
        model: String,
    },
}

impl Model {
    /// Convert the model to a path - may download from huggingface
    async fn get_or_load(self) -> Result<Utf8PathBuf> {
        match self {
            Model::Local { path } => Ok(path),
            Model::HuggingFace { model, repo } => ApiBuilder::new()
                .with_progress(true)
                .build()
                .with_context(|| "unable to create huggingface api")?
                .model(repo)
                .get(&model)
                .await
                .with_context(|| "unable to download model")
                .map(|path| Utf8PathBuf::from_path_buf(path).expect("path must be utf-8")),
        }
    }
}

fn stuff() -> Result<()> {
    // init LLM
    let backend = LlamaBackend::init()?;

    Ok(())
}
