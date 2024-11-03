// TODO refactor and write tests

import Database from "@tauri-apps/plugin-sql";
import type { CharacterPayload, Config, MessageRole } from "./types";
import { platform } from "@tauri-apps/plugin-os";
import { appDataDir, join } from "@tauri-apps/api/path";
import { copyFile } from "@tauri-apps/plugin-fs";

const DATABASE_URL = "sqlite:erpy.sqlite3";

export interface DbCharacter {
  id: number;
  uuid: string;
  url: string;
  payload: string;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: number;
  uuid: string;
  url: string | null;
  payload: CharacterPayload;
  chatCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbChat {
  id: number;
  character_id: number;
  uuid: string;
  created_at: string;
  updated_at: string;
  payload: string;
  title: string | null;
  archived: number;
}

export interface Chat {
  id: number;
  uuid: string;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  characterId: number;
  data: ChatHistoryItem[];
  archived: boolean;
}

export interface ChatHistoryItem {
  role: MessageRole;
  content: ChatContent[];
  chosenAnswer: number;
}

export interface ChatContent {
  content: string;
  timestamp: number;
  modelId: string;
}

let database: Database | null = null;

async function getDatabase(): Promise<Database> {
  if (!database) {
    const isTestEnvironment = import.meta.env.TEST === "true";
    const databaseUrl = isTestEnvironment ? "sqlite:test_erpy.sqlite3" : DATABASE_URL;
    database = await Database.load(databaseUrl);
  }
  return database;
}

export async function getCharacter(id: number): Promise<Character> {
  const database = await getDatabase();

  const rows = await database.select<DbCharacter[]>("SELECT * FROM characters WHERE id = ?", [id]);
  const row = rows[0];
  return {
    id: row.id,
    uuid: row.uuid,
    url: row.url,
    payload: JSON.parse(row.payload),
    chatCount: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CharacterWithChat extends Character {
  chats: { id: number; data: ChatHistoryItem[] }[];
}

export async function getAllCharacters(): Promise<CharacterWithChat[]> {
  type Row = {
    id: number;
    url: string;
    uuid: string;
    payload: string;
    chat_id: number | null;
    chat_payload: string | null;
    created_at: string;
    updated_at: string;
  };

  const database = await getDatabase();
  const rows = await database.select<Row[]>(
    `SELECT c.id, c.created_at, c.updated_at, c.url, c.payload, c.uuid, h.id AS chat_id, h.payload AS chat_payload
    FROM characters c 
    LEFT JOIN chats h ON c.id = h.character_id
    WHERE h.archived = FALSE OR h.archived IS NULL`,
  );

  const groups = Object.groupBy(rows, ({ id }) => id);
  const characters = Object.values(groups).map((rows) => {
    const character = rows![0];
    const data = JSON.parse(character.payload) as CharacterPayload;
    const chats = rows!
      .filter((r) => r.chat_id !== null)
      .map((r) => ({
        id: r.chat_id!,
        data: JSON.parse(r.chat_payload!) as ChatHistoryItem[],
      }));

    return {
      id: character.id,
      uuid: character.uuid,
      url: character.url,
      payload: data,
      chats,
      chatCount: chats.length,
      createdAt: character.created_at,
      updatedAt: character.updated_at,
    } satisfies CharacterWithChat;
  });

  characters.sort((a, b) => a.payload.name.localeCompare(b.payload.name));

  return characters;
}

export interface NewCharacter {
  url: string | null;
  payload: CharacterPayload;
  uuid: string;
}

export async function characterExists(name: string, uuid: string, id: number): Promise<boolean> {
  const database = await getDatabase();
  const rows = await database.select<{uuid: string}[]>(
    "SELECT uuid FROM characters WHERE uuid = $1 OR (payload->>'name') = $2 OR id != $3",
    [uuid, name, id],
  );
  return rows.length > 0;
}

export async function persistCharacters(characters: NewCharacter[]): Promise<Character[]> {
  type Row = { id: number; created_at: string };

  const database = await getDatabase();
  const createdCharacters: Character[] = [];

  for (const character of characters) {
    const row = await database.select<Row[]>(
      "INSERT INTO characters (url, payload, uuid) VALUES ($1, $2, $3) RETURNING id, created_at",
      [character.url, JSON.stringify(character.payload), character.uuid],
    );

    createdCharacters.push({
      id: row[0].id,
      createdAt: row[0].created_at,
      updatedAt: row[0].created_at,
      uuid: character.uuid,
      payload: character.payload,
      chatCount: 0,
      url: character.url,
    });
  }

  return createdCharacters;
}
export interface NewChat {
  characterId: number;
  data: ChatHistoryItem[];
}

export async function saveNewChat(chat: NewChat): Promise<number> {
  type Row = { id: number };

  const database = await getDatabase();
  const uuid = crypto.randomUUID();
  const row = await database.select<Row[]>(
    `INSERT INTO chats (character_id, uuid, payload, title, archived)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [chat.characterId, uuid, JSON.stringify(chat.data), null, 0],
  );

  return row[0].id;
}

export async function updateChat(id: number, history: ChatHistoryItem[]) {
  const database = await getDatabase();
  await database.execute("UPDATE chats SET payload = $1 WHERE id = $2", [
    JSON.stringify(history),
    id,
  ]);
}

export async function getAllChats(): Promise<Chat[]> {
  const database = await getDatabase();
  const rows = await database.select<DbChat[]>("SELECT * FROM chats");
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    characterId: row.character_id,
    data: JSON.parse(row.payload),
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uuid: row.uuid,
  }));
}

export async function getChatsForCharacter(characterId: number): Promise<Chat[]> {
  const database = await getDatabase();
  const rows = await database.select<DbChat[]>(
    "SELECT * FROM chats WHERE character_id = $1 AND archived = FALSE",
    [characterId],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    characterId: row.character_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uuid: row.uuid,
    data: JSON.parse(row.payload),
    archived: row.archived === 1,
  }));
}

export async function getChatById(characterId: number, chatId: number): Promise<Chat | undefined> {
  const database = await getDatabase();
  const rows = await database.select<DbChat[]>(
    "SELECT * FROM chats WHERE character_id = $1 AND id = $2",
    [characterId, chatId],
  );
  if (rows.length === 0) {
    return undefined;
  } else {
    const row = rows[0];
    return {
      id: row.id,
      uuid: row.uuid,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      characterId: row.character_id,
      data: JSON.parse(row.payload),
      title: row.title,
      archived: row.archived === 1,
    };
  }
}

export async function deleteChat(id: number) {
  const database = await getDatabase();
  await database.execute("DELETE FROM chats WHERE id = $1", [id]);
}

export async function updateChatTitle(chatId: number, title: string) {
  const database = await getDatabase();
  await database.execute("UPDATE chats SET title = $1 WHERE id = $2", [title, chatId]);
}

export async function setChatArchived(chatId: number, archived: boolean) {
  const database = await getDatabase();
  const flag = archived ? 1 : 0;
  await database.execute("UPDATE chats SET archived = $1 WHERE id = $2", [flag, chatId]);
}

export async function getConfig(): Promise<Config> {
  const database = await getDatabase();
  const rows: { payload: string }[] = await database.select("SELECT payload FROM config LIMIT 1");
  if (rows.length === 0) {
    const defaultConfig = getDefaultConfig();

    await saveConfig(defaultConfig);
    return defaultConfig;
  } else {
    const config: Config = JSON.parse(rows[0].payload);
    if (!config.sync) {
      config.sync = {};
    }

    return config;
  }
}

export async function getArchivedChats(): Promise<Chat[]> {
  const database = await getDatabase();
  const rows = await database.select<DbChat[]>("SELECT * FROM chats WHERE archived != 0");
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    characterId: row.character_id,
    data: JSON.parse(row.payload),
    archived: row.archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    uuid: row.uuid,
  }));
}

export function getDefaultConfig(): Config {
  const os = platform();
  const port = os === "windows" ? 5001 : 1234;

  return {
    apiUrl: `http://localhost:${port}/v1`,
    userName: "User",
    notifications: {
      newMessage: false,
    },
    temperature: 0.8,
    firstTimeSetupCompleted: false,
    sync: {},
  } satisfies Config;
}

export async function saveConfig(config: Config) {
  const database = await getDatabase();
  await database.execute(
    "INSERT INTO config (id, payload) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET payload = excluded.payload",
    [JSON.stringify(config)],
  );
}

export async function backupDatabase() {
  const databaseFile = await join(await appDataDir(), "erpy.sqlite3");
  const timestamp = new Date().toISOString().replace(/:/g, "-");
  const fileName = `erpy-${timestamp}.backup.sqlite3`;
  const backupFile = await join(await appDataDir(), fileName);

  await copyFile(databaseFile, backupFile);
}
