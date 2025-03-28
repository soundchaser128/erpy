use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct SyncSettings {
    pub server_url: Option<String>,
    pub client_id: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct LlmSettings {
    pub max_tokens: Option<usize>,
    pub temperature: Option<f64>,
    pub frequency_penalty: Option<f32>,
    pub presence_penalty: Option<f32>,
    pub repeat_penalty: Option<f32>,
    pub top_p: Option<f64>,
    pub seed: Option<i64>,
    pub strip_thinking_tags: Option<bool>,
}

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    pub new_message: bool,
}

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExperimentalSettings {
    pub local_llm: bool,
    pub text_to_speech: bool,
}

#[derive(Serialize, Deserialize, Debug, Default)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub user_name: String,
    pub notifications: NotificationSettings,
    pub sync: SyncSettings,
    pub llm: LlmSettings,
    pub experimental: ExperimentalSettings,
}
