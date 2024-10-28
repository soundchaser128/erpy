use anyhow::Result;
use erpy_ai::{CompletionApi, CompletionApis, CompletionRequest, MessageHistoryItem, MessageRole};
use erpy_types::Chat;
use serde::Serialize;

pub fn chat_to_string(chat: &Chat) -> String {
    let max_tokens = 8192;

    #[derive(Serialize)]
    struct Entry {
        role: String,
        content: String,
    }

    let mut total_tokens = 0;
    let mut pairs = vec![];
    for entry in chat.data.iter().rev() {
        let answer = &entry.content[entry.chosen_answer];
        let token_count = answer.content.len() / 4;
        if total_tokens + token_count > max_tokens {
            break;
        }

        pairs.push(Entry {
            role: format!("{:?}", entry.role),
            content: answer.content.clone(),
        });
        total_tokens += token_count;
    }

    serde_json::to_string_pretty(&pairs).unwrap()
}

pub async fn summarize(chat: &Chat, client: &CompletionApis, prompt: &str) -> Result<String> {
    let template = format!("{}\n\n{}", prompt, chat_to_string(chat));

    let history = vec![
        MessageHistoryItem {
            role: MessageRole::System,
            content: "You are a knowledgeable and friendly AI assistant".into(),
        },
        MessageHistoryItem {
            role: MessageRole::User,
            content: template,
        },
    ];

    let request = CompletionRequest {
        messages: history,
        temperature: Some(0.2),
        model: "unused".into(),
        stream: false,
        max_tokens: Some(100),
        ..Default::default()
    };

    let response = client.get_completions(&request).await?;
    Ok(response.into_message())
}
