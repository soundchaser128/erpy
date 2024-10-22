#![allow(dead_code)]

use anyhow::{anyhow, bail, Result};
use erpy_types::Character;
use log::info;
use serde::{Deserialize, Serialize};
use serde_json::Value;

const DEFAULT_SYSTEM_PROMPT: &str =
    "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.";

#[derive(Default, Debug, Clone, PartialEq, Deserialize)]
pub struct ChubAiCharacter {
    pub errors: Option<Value>,
    pub node: ChubAiChracterNode,
}

#[derive(Default, Debug, Clone, PartialEq, Deserialize)]
pub struct ChubAiChracterNode {
    pub id: i64,
    pub name: String,
    pub description: String,
    pub topics: Vec<String>,
    #[serde(rename = "nTokens")]
    pub n_tokens: i64,
    pub tagline: String,
    pub definition: ChubAiDefinition,
    pub permissions: String,
}

#[derive(Default, Debug, Clone, PartialEq, Deserialize)]
pub struct ChubAiDefinition {
    pub id: i64,
    pub avatar: String,
    pub name: String,
    pub description: String,
    pub example_dialogs: String,
    pub first_message: String,
    pub personality: String,
    pub scenario: String,
    pub system_prompt: String,
    pub post_history_instructions: String,
    pub tavern_personality: String,
    pub alternate_greetings: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CharacterCard {
    pub spec: String,
    pub spec_version: String,
    pub data: CharacterCardData,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CharacterCardData {
    pub alternate_greetings: Vec<String>,
    pub avatar: Option<String>,
    pub character_version: String,
    pub creator: String,
    pub creator_notes: String,
    pub description: String,
    #[serde(rename = "first_mes")]
    pub first_message: String,
    #[serde(rename = "mes_example")]
    pub message_example: String,
    pub name: String,
    pub personality: String,
    pub post_history_instructions: Option<String>,
    pub scenario: String,
    pub system_prompt: String,
    pub tags: Vec<String>,
}

pub async fn character_from_chub_ai(url: &str) -> Result<Character> {
    let parsed_url = reqwest::Url::parse(url)?;
    let api_url = format!("https://api.chub.ai/api{}?full=true", parsed_url.path());
    let response: ChubAiCharacter = reqwest::get(&api_url).await?.json().await?;
    info!("received character: {response:#?} for URL {url}");

    let mut first_messages = vec![response.node.definition.first_message];
    first_messages.extend(response.node.definition.alternate_greetings);

    Ok(Character {
        name: response.node.definition.name,
        description: response.node.definition.description,
        personality: response.node.definition.personality,
        first_messages,
        tags: response.node.topics,
        system_prompt: if response.node.definition.system_prompt.trim().is_empty() {
            DEFAULT_SYSTEM_PROMPT.to_string()
        } else {
            response.node.definition.system_prompt
        },
        avatar: Some(response.node.definition.avatar),
    })
}

pub fn character_from_png_bytes(bytes: &[u8]) -> Result<Character> {
    use base64::prelude::*;
    use zune_png::PngDecoder;

    let mut decoder = PngDecoder::new(&*bytes);
    decoder.decode()?;

    let info = decoder
        .get_info()
        .ok_or_else(|| anyhow!("no metadata in png file"))?;

    let base64 = info
        .text_chunk
        .iter()
        .find(|c| c.keyword == b"chara")
        .map(|c| c.text.as_slice())
        .ok_or_else(|| anyhow!("no character metadata in png file"))?;

    let json = BASE64_STANDARD.decode(base64)?;
    let json: CharacterCard = serde_json::from_slice(&json)?;

    // TODO when avatar is "none"/None/not a URL, store it on the server somewhere (not sure how static files work in tauri)

    let mut first_messages = vec![json.data.first_message];
    first_messages.extend(json.data.alternate_greetings);

    Ok(Character {
        name: json.data.name,
        description: json.data.description,
        personality: json.data.personality,
        tags: json.data.tags,
        system_prompt: if json.data.system_prompt.trim().is_empty() {
            DEFAULT_SYSTEM_PROMPT.to_string()
        } else {
            json.data.system_prompt
        },
        first_messages,
        avatar: json.data.avatar,
    })
}

pub async fn character_fron_png_url(url: &str) -> Result<Character> {
    let bytes = reqwest::get(url).await?.bytes().await?;

    character_from_png_bytes(&*bytes)
}

pub async fn character_from_string(string: &str) -> Result<Character> {
    if string.starts_with("https://") {
        let url = reqwest::Url::parse(string)?;
        if url.host_str() == Some("chub.ai") {
            character_from_chub_ai(string).await
        } else {
            character_fron_png_url(string).await
        }
    } else {
        bail!("unsupported character source: {string}");
    }
}
