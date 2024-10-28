use axum::{
    body::Body,
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use erpy_types::{Character, Chat};
use serde::Deserialize;
use serde_json::json;
use sqlx::PgPool;
use tower_http::trace::TraceLayer;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};
use uuid::Uuid;

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
    pub db: PgPool,
}

#[derive(Deserialize)]
pub struct ClientIdQuery {
    pub client_id: String,
}

async fn create_client_if_not_exists(db: &PgPool, client_id: &str) -> Result<()> {
    sqlx::query!(
        "INSERT INTO client (client_id) VALUES ($1) ON CONFLICT DO NOTHING",
        client_id
    )
    .execute(db)
    .await
    .map_err(|e| Error(e.into()))?;

    Ok(())
}

async fn find_character_id(db: &PgPool, remote_id: i32, client_id: &str) -> Result<Uuid> {
    sqlx::query_scalar!(
        "SELECT uuid FROM character WHERE remote_id = $1 AND client_id = $2",
        remote_id,
        client_id
    )
    .fetch_one(db)
    .await
    .map_err(|e| Error(e.into()))
}

#[axum::debug_handler]
async fn fetch_chats(state: State<AppState>) -> Result<Json<Vec<Chat>>> {
    let rows = sqlx::query!("SELECT c.*, ch.remote_id AS character_remote_id FROM chat c INNER JOIN character ch ON c.character_id = ch.uuid")
        .fetch_all(&state.db)
        .await
        .map_err(|e| Error(e.into()))?;
    let mut chats = vec![];

    for row in rows {
        chats.push(Chat {
            uuid: row.uuid,
            archived: row.archived,
            created_at: row.created_at.to_string(),
            character_id: row.character_remote_id,
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
async fn persist_chat(
    state: State<AppState>,
    query: Query<ClientIdQuery>,
    chat: Json<Chat>,
) -> Result<()> {
    create_client_if_not_exists(&state.db, &query.client_id).await?;
    let character_uuid = find_character_id(&state.db, chat.id, &query.client_id).await?;
    sqlx::query!(
        "INSERT INTO chat (uuid, remote_id, title, character_id, updated_at, payload, client_id)
        VALUES ($1, $2, $3, $4, NOW(), $5, $6)
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
        query.client_id,
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
            id: row.remote_id,
            url: row.url,
            payload: serde_json::from_value(row.payload).unwrap(),
            uuid: Some(row.uuid),
        });
    }

    Ok(Json(characters))
}

#[axum::debug_handler]
async fn persist_character(
    state: State<AppState>,
    query: Query<ClientIdQuery>,
    character: Json<Character>,
) -> Result<()> {
    create_client_if_not_exists(&state.db, &query.client_id).await?;

    sqlx::query!(
        "INSERT INTO character (uuid, remote_id, url, payload, client_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (uuid) DO UPDATE SET
            url = $3,
            payload = $4",
        character.uuid,
        character.id,
        character.url,
        serde_json::to_value(&character.payload).unwrap(),
        query.client_id,
    )
    .execute(&state.db)
    .await
    .map_err(|e| Error(e.into()))?;

    Ok(())
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

    let db_url = std::env::var("DATABASE_URL")?;
    let db = PgPool::connect(&db_url).await?;

    sqlx::migrate!("./migrations").run(&db).await?;

    let router = Router::new()
        .route("/api/chat", get(fetch_chats))
        .route("/api/chat/:id", get(fetch_chat_by_id))
        .route("/api/chat", post(persist_chat))
        .route("/api/character", get(fetch_characters))
        .route("/api/character", post(persist_character))
        .with_state(AppState { db })
        .layer(TraceLayer::new_for_http());

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
