use std::{fmt, future::Future, pin::Pin};

use anyhow::Result;

use serde::{Deserialize, Serialize};
use tokio_stream::Stream;

#[cfg(feature = "llama")]
pub mod llama;

#[cfg(feature = "mistral")]
pub mod mistral;

pub mod open_ai;

#[derive(Debug, Deserialize)]
pub struct ModelsResponse {
    pub data: Vec<Model>,
}

#[derive(Debug, Deserialize)]
pub struct Model {
    pub id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

impl fmt::Display for MessageRole {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            MessageRole::User => write!(f, "user"),
            MessageRole::Assistant => write!(f, "assistant"),
            MessageRole::System => write!(f, "system"),
        }
    }
}
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageHistoryItem {
    pub role: MessageRole,
    pub content: String,
}

#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CompletionRequest {
    pub messages: Vec<MessageHistoryItem>,
    pub model: String,
    pub stream: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<usize>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub frequency_penalty: Option<f32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub presence_penalty: Option<f32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub repeat_penalty: Option<f32>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_p: Option<f64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<i64>,
}
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamingCompletionResponse {
    pub choices: Vec<StreamingCompletionChoice>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamingCompletionChoice {
    pub delta: DeltaContent,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeltaContent {
    pub content: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CompletionResponse {
    pub id: String,
    pub created: i64,
    pub model: String,
    pub choices: Vec<CompletionChoice>,
}

impl CompletionResponse {
    pub fn into_message(self) -> String {
        let choice = self.choices.into_iter().next().unwrap();
        choice.message.content
    }
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CompletionChoice {
    pub index: i32,
    pub finish_reason: String,
    pub message: CompletionMessage,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CompletionMessage {
    pub role: MessageRole,
    pub content: String,
}

pub trait CompletionApi {
    async fn get_completions_stream(
        &self,
        request: &CompletionRequest,
    ) -> Result<impl Stream<Item = StreamingCompletionResponse>>;

    fn list_models(&self) -> impl Future<Output = Result<Vec<String>>> + Send;

    fn get_completions(
        &self,
        request: &CompletionRequest,
    ) -> impl Future<Output = Result<CompletionResponse>> + Send;
}

pub enum CompletionApis {
    #[cfg(feature = "llama")]
    Llama(llama::LlamaCppCompletions),
    #[cfg(feature = "mistral")]
    Mistral(mistral::MistralRsCompletions),
    OpenAi(open_ai::OpenAiCompletions),
}

impl CompletionApis {
    pub async fn get_completions_stream<'a>(
        &'a self,
        request: &'a CompletionRequest,
    ) -> Result<Pin<Box<dyn Stream<Item = StreamingCompletionResponse> + Send + 'a>>> {
        let stream = match self {
            #[cfg(feature = "llama")]
            CompletionApis::Llama(api) => api.get_completions_stream(request).await as _,
            #[cfg(feature = "mistral")]
            CompletionApis::Mistral(api) => {
                Box::pin(api.get_completions_stream(request).await?) as _
            }
            CompletionApis::OpenAi(api) => {
                Box::pin(api.get_completions_stream(request).await?) as _
            }
        };

        Ok(stream)
    }

    pub async fn list_models(&self) -> Result<Vec<String>> {
        match self {
            #[cfg(feature = "llama")]
            CompletionApis::Llama(api) => api.list_models().await,
            #[cfg(feature = "mistral")]
            CompletionApis::Mistral(api) => api.list_models().await,
            CompletionApis::OpenAi(api) => api.list_models().await,
        }
    }

    pub async fn get_completions(&self, request: &CompletionRequest) -> Result<CompletionResponse> {
        match self {
            #[cfg(feature = "llama")]
            CompletionApis::Llama(api) => api.get_completions(request).await,
            #[cfg(feature = "mistral")]
            CompletionApis::Mistral(api) => api.get_completions(request).await,
            CompletionApis::OpenAi(api) => api.get_completions(request).await,
        }
    }
}
