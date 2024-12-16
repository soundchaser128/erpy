use std::fmt;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Chat {
    pub id: i32,
    pub uuid: Uuid,
    pub created_at: String,
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

impl fmt::Display for MessageRole {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            MessageRole::User => write!(f, "user"),
            MessageRole::Assistant => write!(f, "assistant"),
            MessageRole::System => write!(f, "system"),
        }
    }
}
#[derive(Serialize, Deserialize)]
pub struct CharacterInformation {
    pub name: String,
    pub description: String,
    pub personality: String,
    pub first_messages: Vec<String>,
    pub tags: Vec<String>,
    pub system_prompt: String,
    pub avatar: Option<String>,
    pub image_base64: Option<String>,
}

impl fmt::Debug for CharacterInformation {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("CharacterInformation")
            .field("name", &self.name)
            .field("description", &self.description)
            .field("personality", &self.personality)
            .field("first_messages", &self.first_messages)
            .field("tags", &self.tags)
            .field("system_prompt", &self.system_prompt)
            .field("avatar", &self.avatar)
            .field("image_base64", &self.image_base64.is_some())
            .finish()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Character {
    pub id: i32,
    pub url: Option<String>,
    pub payload: CharacterInformation,
    pub uuid: Option<Uuid>,
}
