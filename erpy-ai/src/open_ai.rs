use std::time::Duration;

use anyhow::{bail, Result};
use log::{debug, info, trace};
use reqwest::Client;
use reqwest_eventsource::{Event, EventSource};
use tokio_stream::{Stream, StreamExt};

use super::{
    CompletionApi, CompletionRequest, CompletionResponse, ModelsResponse,
    StreamingCompletionResponse,
};
pub struct OpenAiCompletions {
    base_url: String,
    api_key: Option<String>,
    client: Client,
    model: String,
}

impl OpenAiCompletions {
    pub fn new(api_url: String, api_key: Option<String>, model: String) -> Self {
        OpenAiCompletions {
            base_url: api_url,
            api_key: api_key,
            client: Client::new(),
            model,
        }
    }
}

impl CompletionApi for OpenAiCompletions {
    async fn get_completions_stream(
        &self,
        mut request: CompletionRequest,
    ) -> Result<impl Stream<Item = StreamingCompletionResponse>> {
        if !request.stream {
            bail!("Only streaming completions are supported for get_completions_stream");
        }

        request.model = self.model.clone();

        let url = format!("{}/chat/completions", self.base_url);
        info!("Sending request (streaming) {request:#?} to {url}");
        let mut request = self.client.post(&url).json(&request);
        if let Some(key) = &self.api_key {
            request = request.bearer_auth(key);
        }
        let event_source = EventSource::new(request)?;

        Ok(event_source
            .take_while(|e| !e.is_err())
            .filter_map(|event| {
                debug!("received event: {:?}", event);
                let event = event.ok()?;
                match event {
                    Event::Message(msg) => {
                        let response: StreamingCompletionResponse =
                            serde_json::from_str(&msg.data).ok()?;
                        trace!("parsed response: {:#?}", response);
                        Some(response)
                    }
                    Event::Open => None,
                }
            }))
    }

    async fn list_models(&self) -> Result<Vec<String>> {
        let url = format!("{}/models", self.base_url);
        info!("Sending request to {url}");
        let mut request = self.client.get(&url).timeout(Duration::from_secs(2));
        if let Some(api_key) = &self.api_key {
            request = request.bearer_auth(api_key);
        }
        let response = request.send().await?.json::<ModelsResponse>().await?;

        Ok(response.data.into_iter().map(|m| m.id).collect())
    }

    async fn get_completions(&self, mut request: CompletionRequest) -> Result<CompletionResponse> {
        if request.stream {
            bail!("Only non-streaming completions are supported for get_completions");
        }

        let url = format!("{}/chat/completions", self.base_url);
        info!("Sending request (batch) {request:#?} to {url}");

        request.model = self.model.clone();

        let response = self
            .client
            .post(&url)
            .json(&request)
            .send()
            .await?
            .json()
            .await?;

        Ok(response)
    }
}
