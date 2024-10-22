use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Chat {
    pub id: i32,
    pub title: Option<String>,
    pub character_id: i32,
    pub data: Vec<ChatHistoryItem>,
    pub archived: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatHistoryItem {
    pub role: MessageRole,
    pub content: Vec<ChatContent>,
    pub chosen_answer: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ChatContent {
    pub content: String,
    pub timestamp: i64,
    pub model_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum MessageRole {
    User,
    Assistant,
    System,
}

#[derive(Debug, Serialize)]
pub struct Character {
    pub name: String,
    pub description: String,
    pub personality: String,
    pub first_messages: Vec<String>,
    pub tags: Vec<String>,
    pub system_prompt: String,
    pub avatar: Option<String>,
}
