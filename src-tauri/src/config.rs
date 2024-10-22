use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub api_url: String,
    pub api_key: Option<String>,
    pub user_name: String,
    pub selected_model_path: Option<String>,

    pub kobold_cpp_path: Option<PathBuf>,
    pub max_tokens: Option<usize>,
    pub temperature: Option<f64>,
    pub frequency_penalty: Option<f32>,
    pub presence_penalty: Option<f32>,
    pub repeat_penalty: Option<f32>,
    pub top_p: Option<f64>,
    pub seed: Option<i64>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            api_url: "http://localhost:1234/v1".into(),
            api_key: None,
            user_name: "User".into(),
            selected_model_path: None,
            kobold_cpp_path: None,
            max_tokens: None,
            temperature: None,
            frequency_penalty: None,
            presence_penalty: None,
            repeat_penalty: None,
            top_p: None,
            seed: None,
        }
    }
}
