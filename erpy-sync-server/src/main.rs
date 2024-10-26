use axum::{
    body::Body,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use erpy_types::Chat;
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

#[axum::debug_handler]
async fn fetch_chats() -> Result<()> {
    Ok(())
}

#[axum::debug_handler]
async fn fetch_chat_by_id() {}

// TODO how to handle conflicts in the "remote_id" field?
//  i guess it should be a UUID or something
#[axum::debug_handler]
async fn persist_chat(state: State<AppState>, chat: Json<Chat>) -> Result<()> {
    sqlx::query!(
        "INSERT INTO chat (title, character_id, updated_at, payload, remote_id)
        VALUES ($1, $2, NOW(), $3, $4)
        ON CONFLICT (id) DO UPDATE SET
            title = $1,
            character_id = $2,
            updated_at = NOW(),
            payload = $3",
        chat.title,
        chat.character_id,
        serde_json::to_value(&chat.data).unwrap(),
        chat.id,
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

    // let router = Router::new().route("/", get());
    let router = Router::new()
        .route("/api/chat", get(fetch_chats))
        .route("/api/chat/:id", get(fetch_chat_by_id))
        .route("/api/chat", post(persist_chat))
        .with_state(AppState { db });

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4041").await.unwrap();
    axum::serve(listener, router).await.unwrap();

    Ok(())
}
