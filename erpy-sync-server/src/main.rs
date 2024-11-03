use anyhow::Context;
use axum::{
    body::Body,
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use database::Database;
use erpy_types::{Character, Chat};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sqlx::PgPool;
use tower_http::{trace::TraceLayer, validate_request::ValidateRequestHeaderLayer};
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

mod database;

pub struct Error(anyhow::Error);

impl From<anyhow::Error> for Error {
    fn from(e: anyhow::Error) -> Self {
        Self(e)
    }
}

pub type Result<T> = std::result::Result<T, Error>;

impl IntoResponse for Error {
    fn into_response(self) -> axum::response::Response {
        error!("error: {}", self.0);

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
    pub db: Database,
}

#[derive(Deserialize)]
pub struct ClientIdQuery {
    pub client_id: String,
}

#[axum::debug_handler]
async fn fetch_chats(state: State<AppState>) -> Result<Json<Vec<Chat>>> {
    let chats = state.db.fetch_chats().await?;

    Ok(Json(chats))
}

#[axum::debug_handler]
async fn fetch_chat_by_id() {}

#[axum::debug_handler]
async fn persist_chat(
    state: State<AppState>,
    query: Query<ClientIdQuery>,
    chat: Json<Chat>,
) -> Result<()> {
    state.db.persist_chat(chat.0, &query.client_id).await?;

    Ok(())
}

#[axum::debug_handler]
async fn fetch_characters(state: State<AppState>) -> Result<Json<Vec<Character>>> {
    let characters = state.db.fetch_characters().await?;

    Ok(Json(characters))
}

#[axum::debug_handler]
async fn persist_character(
    state: State<AppState>,
    query: Query<ClientIdQuery>,
    character: Json<Character>,
) -> Result<()> {
    state
        .db
        .persist_character(character.0, &query.client_id)
        .await?;

    Ok(())
}

#[axum::debug_handler]
async fn application_health() -> Result<Json<serde_json::Value>> {
    Ok(Json(json!({ "status": "ok" })))
}

#[derive(Deserialize, Serialize)]
pub struct SyncAllPayload {
    pub characters: Vec<Character>,
    pub chats: Vec<Chat>,
}

#[axum::debug_handler]
async fn sync_all(
    state: State<AppState>,
    client_id: Query<ClientIdQuery>,
    Json(payload): Json<SyncAllPayload>,
) -> Result<Json<SyncAllPayload>> {
    let payload = state
        .db
        .sync_all(payload.characters, payload.chats, &client_id.client_id)
        .await?;

    Ok(Json(payload))
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug,axum::rejection=trace".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();
    info!("starting up erpy-sync-server");

    let api_key = std::env::var("ERPY_API_KEY").context("failed to read ERPY_API_KEY")?;
    let db_url = std::env::var("DATABASE_URL").context("failed to read DATABASE_URL")?;
    let db = PgPool::connect(&db_url).await?;

    // sqlx::migrate!("./migrations").run(&db).await?;

    let router = Router::new()
        .route("/api/health", get(application_health))
        .route("/api/chat", get(fetch_chats))
        .route("/api/chat/:id", get(fetch_chat_by_id))
        .route("/api/chat", post(persist_chat))
        .route("/api/character", get(fetch_characters))
        .route("/api/character", post(persist_character))
        .route("/api/sync", post(sync_all))
        .with_state(AppState {
            db: Database::new(db),
        })
        .layer(TraceLayer::new_for_http())
        .layer(ValidateRequestHeaderLayer::bearer(&api_key));

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
