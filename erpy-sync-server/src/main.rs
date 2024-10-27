use axum::{
    body::Body,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use erpy_types::{Character, Chat};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use tracing::info;

pub struct Error(anyhow::Error);

impl From<anyhow::Error> for Error {
    fn from(e: anyhow::Error) -> Self {
        Self(e)
    }
}

pub type Result<T> = std::result::Result<T, Error>;

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        let body = json!({
            "error": self.0.to_string(),
        })
        .to_string();
        let body = Body::new(body);

        Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .header("content-type", "application/json")
            .body(body)
            .expect("failed to render response")
    }
}

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
}

#[derive(Deserialize)]
pub struct ClientIdQuery {
    pub client_id: String,
}

#[axum::debug_handler]
async fn fetch_chats(state: State<AppState>) -> Result<Json<Vec<Chat>>> {
    let rows = sqlx::query!("SELECT * FROM chat")
        .fetch_all(&state.db)
        .await
        .map_err(|e| Error(e.into()))?;
    let mut chats = vec![];

    for row in rows {
        chats.push(Chat {
            uuid: Some(row.uuid),
            archived: row.archived,
            character_id: row.character_id,
            id: row.remote_id,
            title: row.title,
            data: serde_json::from_value(row.payload).unwrap(),
        })
    }

    Ok(Json(chats))
}

#[axum::debug_handler]
async fn fetch_chat_by_id() {}

#[axum::debug_handler]
async fn persist_chat(state: State<AppState>, chat: Json<Chat>) -> Result<()> {
    let character_uuid = Default::default();

    sqlx::query!(
        "INSERT INTO chat (uuid, remote_id, title, character_id, updated_at, payload)
        VALUES ($1, $2, $3, $4, NOW(), $5)
        ON CONFLICT (uuid) DO UPDATE SET
            title = $3,
            character_id = $4,
            updated_at = NOW(),
            payload = $5",
        chat.uuid,
        chat.id,
        chat.title,
        character_uuid,
        serde_json::to_value(&chat.data).unwrap(),
    )
    .execute(&state.db)
    .await
    .map_err(|e| Error(e.into()))?;

    Ok(())
}

#[axum::debug_handler]
async fn fetch_characters(state: State<AppState>) -> Result<Json<Vec<Character>>> {
    let rows = sqlx::query!("SELECT * FROM character")
        .fetch_all(&state.db)
        .await
        .map_err(|e| Error(e.into()))?;

    let mut characters = vec![];

    for row in rows {
        characters.push(Character {
            id: row.id,
            url: row.url,
            payload: serde_json::from_value(row.payload).unwrap(),
        });
    }

    Ok(Json(characters))
}

#[axum::debug_handler]
async fn persist_character(state: State<AppState>, character: Json<Character>) -> Result<()> {
    sqlx::query!(
        "INSERT INTO character (id, url, payload)
        VALUES ($1, $2, $3)
        ON CONFLICT (id) DO UPDATE SET
            url = $2,
            payload = $3",
        character.id,
        character.url,
        serde_json::to_value(&character.payload).unwrap(),
    )
    .execute(&state.db)
    .await
    .map_err(|e| Error(e.into()))?;

    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt().init();
    info!("starting up erpy-sync-server");

    let db_url = std::env::var("DATABASE_URL")?;
    let db = PgPool::connect(&db_url).await?;

    sqlx::migrate!("./migrations").run(&db).await?;

    let router = Router::new()
        .route("/api/chat", get(fetch_chats))
        .route("/api/chat/:id", get(fetch_chat_by_id))
        .route("/api/chat", post(persist_chat))
        .route("/api/character", get(fetch_characters))
        .route("/api/character", post(persist_character))
        .with_state(AppState { db });

    let bind_addr = std::env::var("ERPY_ADDR").unwrap_or("127.0.0.1".into());
    let port = std::env::var("PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(4041);
    let addr = format!("{bind_addr}:{port}");
    info!("binding to {addr}");

    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, router).await.unwrap();

    Ok(())
}
