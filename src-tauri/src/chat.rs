use anyhow::Result;
use erpy_ai::{CompletionApis, CompletionRequest, MessageHistoryItem};
use erpy_types::{Chat, MessageRole};

pub async fn summarize(chat: &Chat, client: &CompletionApis, prompt: &str) -> Result<String> {
    let mut history: Vec<_> = chat
        .history
        .iter()
        .map(|entry| MessageHistoryItem {
            role: entry.role,
            content: entry.content[entry.chosen_answer].content.clone(),
        })
        .collect();

    history.push(MessageHistoryItem {
        role: MessageRole::User,
        content: prompt.into(),
    });

    let request = CompletionRequest {
        messages: history,
        temperature: Some(0.2),
        model: "unused".into(),
        stream: false,
        max_tokens: Some(100),
        ..Default::default()
    };

    let response = client.get_completions(request).await?;
    Ok(response.into_message())
}
