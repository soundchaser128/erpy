use anyhow::anyhow;
use anyhow_tauri::{bail, IntoTAResult, TAResult};
use character::character_from_png_bytes;
use character::character_from_string;
use config::Config;
use erpy_ai::estimate_tokens;
use erpy_ai::{open_ai::OpenAiCompletions, CompletionApis, CompletionRequest, MessageHistoryItem};
use erpy_ai::{CompletionApi, ModelInfo};
use erpy_types::CharacterInformation;
use erpy_types::Chat;
use log::debug;
use log::error;
use log::{info, LevelFilter};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Listener, Manager};
use tokio::sync::{oneshot, Mutex};
use tokio_stream::StreamExt;

pub mod character;
pub mod chat;
pub mod config;

struct State {
    completions: Mutex<Option<CompletionApis>>,
}

#[tauri::command]
async fn list_models(app: AppHandle) -> TAResult<Vec<String>> {
    let state = app.state::<State>();
    let lock = state.completions.lock().await;
    let Some(api) = lock.as_ref() else {
        bail!("no model loaded")
    };
    let models = api.list_models().await?;
    Ok(models)
}

#[tauri::command]
fn list_models_on_disk() -> TAResult<Vec<ModelInfo>> {
    #[cfg(feature = "mistral")]
    let models = erpy_ai::mistral::list_models_on_disk()?;

    #[cfg(not(feature = "mistral"))]
    let models = Vec::new();

    Ok(models)
}

#[tauri::command]
async fn chat_completion(
    app: AppHandle,
    config: Config,
    message_history: Vec<MessageHistoryItem>,
) -> TAResult<()> {
    info!(
        "received request to chat with {} tokens",
        estimate_tokens(&message_history)
    );
    debug!("chat history: {message_history:#?}");
    let state = app.state::<State>();
    let lock = state.completions.lock().await;
    let Some(api) = lock.as_ref() else {
        bail!("no model loaded")
    };

    let mut request = CompletionRequest {
        messages: message_history,
        temperature: config.llm.temperature,
        model: Default::default(),
        stream: true,
        max_tokens: config.llm.max_tokens,
        frequency_penalty: config.llm.frequency_penalty,
        presence_penalty: config.llm.presence_penalty,
        repeat_penalty: config.llm.repeat_penalty,
        top_p: config.llm.top_p,
        seed: config.llm.seed,
    };

    if config.llm.strip_thinking_tags.unwrap_or(true) {
        request = request.strip_thinking_tags();
    }

    let mut stream = api.get_completions_stream(request).await?;
    let (rx, mut tx) = oneshot::channel();

    app.once("cancel", move |_| {
        if let Err(e) = rx.send(()) {
            info!("failed to send cancel signal: {:#?}", e);
        }
    });

    while let Some(response) = stream.next().await {
        if let Ok(_) = tx.try_recv() {
            info!("cancelling completion stream");
            drop(stream);
            break;
        }

        app.emit("completion", response)
            .expect("failed to emit completion");
    }

    info!("completion stream finished");
    app.emit("completion_done", ())
        .expect("failed to emit completion-done");

    Ok(())
}

#[tauri::command]
async fn fetch_character(character_url: String) -> TAResult<CharacterInformation> {
    info!("creating character from URL {character_url}");
    let character = character_from_string(&character_url).await?;
    Ok(character)
}

#[tauri::command]
async fn upload_character_pngs(pngs: Vec<String>) -> TAResult<Vec<CharacterInformation>> {
    use base64::prelude::*;

    info!("uploading {} character PNG files", pngs.len());

    let mut characters = Vec::new();
    for base64 in pngs {
        let bytes = BASE64_STANDARD
            .decode(base64)
            .map_err(|e| anyhow!("failed to decode base64: {e}"))?;
        let character = character_from_png_bytes(&bytes)?;
        debug!("received character: {:#?}", character);

        characters.push(character);
    }

    Ok(characters)
}

#[tauri::command]
async fn active_model(app: AppHandle) -> Option<String> {
    let state = app.state::<State>();
    let lock = state.completions.lock().await;
    let Some(api) = lock.as_ref() else {
        return None;
    };

    let models = api.list_models().await;
    models.ok().and_then(|list| list.into_iter().next())
}

#[tauri::command]
async fn summarize(app: AppHandle, chat: Chat, prompt: String) -> TAResult<String> {
    let state = app.state::<State>();
    let lock = state.completions.lock().await;
    if let Some(api) = lock.as_ref() {
        let summary = chat::summarize(&chat, &api, &prompt)
            .await
            .inspect_err(|e| error!("failed to summarize: {e:?}"))?;
        Ok(summary)
    } else {
        bail!("no model loaded")
    }
}

#[derive(Serialize, Debug, Clone, Copy)]
#[serde(rename_all = "kebab-case")]
pub enum BackendType {
    OpenAi,
    Mistral,
}

#[tauri::command]
async fn get_backends() -> Vec<BackendType> {
    #[cfg(feature = "mistral")]
    return vec![BackendType::OpenAi, BackendType::Mistral];

    #[cfg(not(feature = "mistral"))]
    return vec![BackendType::OpenAi];
}

#[derive(Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum LoadModel {
    #[serde(rename_all = "camelCase")]
    OpenAi {
        api_url: String,
        api_key: Option<String>,
        model: String,
    },
    #[serde(rename_all = "camelCase")]
    #[cfg(feature = "mistral")]
    Mistral {
        model_id: String,
        chat_template: String,
        file_name: String,
    },
}

impl LoadModel {
    pub async fn to_api(self) -> Result<CompletionApis, anyhow::Error> {
        let api = match self {
            LoadModel::OpenAi {
                api_url,
                api_key,
                model,
            } => CompletionApis::OpenAi(OpenAiCompletions::new(api_url, api_key, model)),

            #[cfg(feature = "mistral")]
            LoadModel::Mistral {
                model_id,
                chat_template,
                file_name,
            } => {
                use erpy_ai::mistral::MistralRsCompletions;

                CompletionApis::Mistral(
                    MistralRsCompletions::new(model_id, Some(chat_template), vec![file_name])
                        .await?,
                )
            }
        };

        Ok(api)
    }
}

#[tauri::command]
async fn load_model(app: AppHandle, payload: LoadModel) -> TAResult<()> {
    let mutex = app.state::<State>();
    let mut lock = mutex.completions.lock().await;
    let api = payload.to_api().await?;
    lock.replace(api);

    Ok(())
}

#[tauri::command]
async fn unload_model(app: AppHandle) -> TAResult<()> {
    let mutex = app.state::<State>();
    let mut lock = mutex.completions.lock().await;
    lock.take();

    Ok(())
}

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
enum ConnectionTestResult {
    Success { models: Vec<String> },
    Failure { error: String },
}

#[tauri::command]
async fn test_connection(api_url: String, api_key: Option<String>) -> ConnectionTestResult {
    let api = OpenAiCompletions::new(api_url, api_key, "ignored".into());
    match api.list_models().await {
        Ok(models) => {
            if models.is_empty() {
                ConnectionTestResult::Failure {
                    error: "No models found".to_string(),
                }
            } else {
                ConnectionTestResult::Success { models }
            }
        }
        Err(e) => ConnectionTestResult::Failure {
            error: format!("Failed to connect: {e}"),
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            app.manage(State {
                completions: Mutex::new(None),
            });
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(LevelFilter::Info)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            chat_completion,
            list_models,
            fetch_character,
            active_model,
            summarize,
            upload_character_pngs,
            load_model,
            unload_model,
            test_connection,
            list_models_on_disk,
            get_backends,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
