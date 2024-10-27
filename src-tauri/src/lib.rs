use anyhow::anyhow;
use anyhow_tauri::{bail, IntoTAResult, TAResult};
use character::character_from_png_bytes;
use character::character_from_string;
use config::Config;
use erpy_ai::{open_ai::OpenAiCompletions, CompletionApis, CompletionRequest, MessageHistoryItem};
use erpy_ai::{CompletionApi, ModelInfo};
use erpy_types::CharacterInformation;
use erpy_types::Chat;
use log::{info, LevelFilter};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Listener, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};
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
        "received request to chat with history: {:#?}",
        message_history
    );
    let state = app.state::<State>();
    let lock = state.completions.lock().await;
    let Some(api) = lock.as_ref() else {
        bail!("no model loaded")
    };

    let request = CompletionRequest {
        messages: message_history,
        temperature: config.temperature,
        model: Default::default(),
        stream: true,
        max_tokens: config.max_tokens,
        frequency_penalty: config.frequency_penalty,
        presence_penalty: config.presence_penalty,
        repeat_penalty: config.repeat_penalty,
        top_p: config.top_p,
        seed: config.seed,
    };

    let mut stream = api.get_completions_stream(&request).await?;
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

    app.emit("completion_done", ())
        .expect("failed to emit completion-done");

    Ok(())
}

#[tauri::command]
async fn fetch_character(character_url: String) -> TAResult<CharacterInformation> {
    let character = character_from_string(&character_url).await?;
    Ok(character)
}

#[tauri::command]
async fn upload_character_pngs(pngs: Vec<String>) -> TAResult<Vec<CharacterInformation>> {
    use base64::prelude::*;

    let mut characters = Vec::new();
    for base64 in pngs {
        let bytes = BASE64_STANDARD
            .decode(base64)
            .map_err(|e| anyhow!("failed to decode base64: {e}"))?;
        let character = character_from_png_bytes(&bytes)?;
        info!("received character: {:#?}", character);

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
async fn summarize(app: AppHandle, chat: Chat, config: Config, prompt: String) -> TAResult<String> {
    let state = app.state::<State>();
    let api = &state.completions;
    // let summary = chat::summarize(&chat, &api, &prompt).await?;

    Ok("TODO".into())
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
            LoadModel::OpenAi { api_url, api_key } => {
                CompletionApis::OpenAi(OpenAiCompletions::new(api_url, api_key))
            }
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

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "kebab-case")]
enum ConnectionTestResult {
    Success,
    Failure { error: String },
}

#[tauri::command]
async fn test_connection(api_url: String, api_key: Option<String>) -> ConnectionTestResult {
    let api = OpenAiCompletions::new(api_url, api_key);
    match api.list_models().await {
        Ok(_) => ConnectionTestResult::Success,
        Err(e) => ConnectionTestResult::Failure {
            error: format!("Failed to connect: {e}"),
        },
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "CREATE TABLE characters (
                    id INTEGER PRIMARY KEY, 
                    url VARCHAR, 
                    payload VARCHAR NOT NULL
                )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_chat_history",
            sql: "CREATE TABLE chats (
                    id INTEGER PRIMARY KEY, 
                    title VARCHAR,
                    character_id INTEGER NOT NULL REFERENCES characters (id), 
                    payload VARCHAR NOT NULL
                )",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_config",
            sql: "CREATE TABLE config (id INTEGER PRIMARY KEY, payload VARCHAR NOT NULL)",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "add_archived_column_to_chats",
            sql: "ALTER TABLE chats ADD COLUMN archived INTEGER NOT NULL DEFAULT 0",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "add_uuid_to_chats",
            sql: "ALTER TABLE chats ADD COLUMN uuid VARCHAR",
            kind: MigrationKind::Up,
        },
    ];

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
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:erpy.sqlite3", migrations)
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
            test_connection,
            list_models_on_disk,
            get_backends
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
