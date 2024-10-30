use anyhow::Result;
use erpy_types::{Character, Chat};
use sqlx::PgPool;
use uuid::Uuid;

use crate::SyncAllPayload;

#[derive(Debug, Clone)]
pub struct Database {
    pool: PgPool,
}

impl Database {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_client(&self, client_id: &str) -> Result<()> {
        sqlx::query!(
            "INSERT INTO client (client_id) VALUES ($1) ON CONFLICT DO NOTHING",
            client_id
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn find_character_id(&self, remote_id: i32, client_id: &str) -> Result<Uuid> {
        sqlx::query_scalar!(
            "SELECT uuid FROM character WHERE remote_id = $1 AND client_id = $2",
            remote_id,
            client_id
        )
        .fetch_one(&self.pool)
        .await
        .map_err(From::from)
    }

    pub async fn fetch_characters(&self) -> Result<Vec<Character>> {
        let rows = sqlx::query!("SELECT * FROM character")
            .fetch_all(&self.pool)
            .await?;

        let mut characters = vec![];

        for row in rows {
            characters.push(Character {
                id: row.remote_id,
                url: row.url,
                payload: serde_json::from_value(row.payload).unwrap(),
                uuid: Some(row.uuid),
            });
        }

        Ok(characters)
    }

    pub async fn fetch_chats(&self) -> Result<Vec<Chat>> {
        let rows = sqlx::query!(
            "SELECT c.*, ch.remote_id AS character_remote_id 
            FROM chat c INNER JOIN character ch ON c.character_id = ch.uuid"
        )
        .fetch_all(&self.pool)
        .await?;
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

        Ok(chats)
    }

    pub async fn persist_chat(&self, chat: Chat, client_id: &str) -> Result<()> {
        self.create_client(client_id).await?;

        let character_uuid = self.find_character_id(chat.id, client_id).await?;

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
            client_id,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn persist_character(&self, character: Character, client_id: &str) -> Result<()> {
        self.create_client(client_id).await?;

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
            client_id,
        )
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    pub async fn sync_all(
        &self,
        characters: Vec<Character>,
        chats: Vec<Chat>,
        client_id: &str,
    ) -> Result<SyncAllPayload> {
        for character in characters {
            self.persist_character(character, client_id).await?;
        }

        for chat in chats {
            self.persist_chat(chat, client_id).await?;
        }

        let all_characters = self.fetch_characters().await?;
        let all_chats = self.fetch_chats().await?;

        Ok(SyncAllPayload {
            characters: all_characters,
            chats: all_chats,
        })
    }
}
