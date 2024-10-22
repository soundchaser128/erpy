import Database from "@tauri-apps/plugin-sql";
import type { CharacterPayload, Config, MessageRole } from "./types";
import { platform } from "@tauri-apps/plugin-os";
import { appDataDir, join } from "@tauri-apps/api/path";
import { copyFile } from "@tauri-apps/plugin-fs";

const DATABASE_URL = "sqlite:erpy.sqlite3";

export interface DbCharacter {
  id: number;
  url: string;
  payload: string;
}

export interface Character {
  id: number;
  url?: string;
  data: CharacterPayload;
  chatCount: number;
}

export interface DbChat {
  id: number;
  character_id: number;
  payload: string;
  title: string | null;
  archived: boolean;
}

export interface Chat {
  id: number;
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
    database = await Database.load(DATABASE_URL);
  }
  return database;
}

export async function getCharacter(id: number): Promise<Character> {
  const database = await getDatabase();

  const rows = await database.select<DbCharacter[]>("SELECT * FROM characters WHERE id = ?", [id]);
  const row = rows[0];
  return {
    id: row.id,
    url: row.url,
    data: JSON.parse(row.payload),
    chatCount: 0,
  };
}

interface Row {
  id: number;
  url: string;
  payload: string;
  chat_id: number | null;
  chat_payload: string | null;
}

export async function getAllCharacters() {
  const database = await getDatabase();
  const rows = await database.select<Row[]>(
    `SELECT c.id, c.url, c.payload, h.id AS chat_id, h.payload AS chat_payload 
    FROM characters c 
    LEFT JOIN chats h ON c.id = h.character_id`,
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
      url: character.url,
      data,
      chats,
    };
  });

  characters.sort((a, b) => a.data.name.localeCompare(b.data.name));

  return characters;
}

export interface CharacterPayloadWithUrl {
  url: string;
  payload: CharacterPayload;
}

export async function addCharacters(characters: CharacterPayloadWithUrl[]) {
  const database = await getDatabase();

  for (const { url, payload } of characters) {
    await database.execute("INSERT INTO characters (url, payload) VALUES ($1, $2)", [
      url,
      JSON.stringify(payload),
    ]);
  }
}

export async function persistCharacters(characters: CharacterPayload[]) {
  const database = await getDatabase();
  const directory = await appDataDir();

  const data: Character[] = [];
  for (const character of characters) {
    const row: { id: number }[] = await database.select(
      "INSERT INTO characters (payload) VALUES ($1) RETURNING id",
      [JSON.stringify(character)],
    );
    const id = row[0].id;
    const path = await join(directory, "avatars", `${character.name} - ${id}.png`);
    const avatarUrl = "asset://" + path;
    character.avatar = avatarUrl;
    // update payload
    await database.execute("UPDATE characters SET payload = $1 WHERE id = $2", [
      JSON.stringify(character),
      id,
    ]);

    data.push({
      id,
      data: character,
      chatCount: 0,
    });
  }

  return data;
}

export async function saveChatHistory(
  historyId: number | null,
  characterId: number,
  chatHistory: ChatHistoryItem[],
): Promise<number> {
  const database = await getDatabase();
  if (historyId !== null) {
    await database.execute("UPDATE chats SET payload = $1 WHERE id = $2", [
      JSON.stringify(chatHistory),
      historyId,
    ]);
    return historyId;
  } else {
    const rows: { id: number }[] = await database.select(
      "INSERT INTO chats (character_id, payload) VALUES ($1, $2) RETURNING id",
      [characterId, JSON.stringify(chatHistory)],
    );
    return rows[0].id;
  }
}

export async function getAllChats(characterId: number): Promise<Chat[]> {
  const database = await getDatabase();
  const rows = await database.select<DbChat[]>(
    "SELECT * FROM chats WHERE character_id = $1 AND archived = FALSE",
    [characterId],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    characterId: row.character_id,
    data: JSON.parse(row.payload),
    archived: row.archived,
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
      characterId: row.character_id,
      data: JSON.parse(row.payload),
      title: row.title,
      archived: row.archived,
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
  await database.execute("UPDATE chats SET archived = $1 WHERE id = $2", [archived, chatId]);
}

export async function getConfig(): Promise<Config> {
  const database = await getDatabase();
  const rows: { payload: string }[] = await database.select("SELECT payload FROM config LIMIT 1");
  if (rows.length === 0) {
    const defaultConfig = getDefaultConfig();

    await saveConfig(defaultConfig);
    return defaultConfig;
  } else {
    return JSON.parse(rows[0].payload);
  }
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
