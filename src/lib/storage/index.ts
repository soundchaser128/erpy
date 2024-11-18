import type { CharacterPayload, Config } from "$lib/types";
import * as S from "@effect/schema/Schema";
import { database, id, SqliteBoolean, table, type Evolu } from "@evolu/common";
import { createEvolu } from "@evolu/common-web";

export const CharacterId = id("characters");
export type CharacterId = typeof CharacterId.Type;

const CharactersTable = table({
  id: CharacterId,
  url: S.NonEmptyString,
  name: S.NonEmptyString,
  description: S.String,
  personality: S.String,
  firstMessages: S.Array(S.NonEmptyString),
  tags: S.Array(S.NonEmptyString),
  systemPrompt: S.NonEmptyString,
  avatar: S.String,
});

export type Character = typeof CharactersTable.Type;

export const ChatId = id("chats");
export type ChatId = typeof ChatId.Type;

export enum MessageRole {
  User = "user",
  Assistant = "assistant",
  System = "system",
}

const ChatsTable = table({
  id: ChatId,
  title: S.NonEmptyString,
  characterId: CharacterId,
  archived: SqliteBoolean,
  history: S.Array(
    S.Struct({
      role: S.Enums(MessageRole),
      chosenAnswer: S.Number,
      content: S.Array(
        S.Struct({
          content: S.NonEmptyString,
          timestamp: S.Number,
          modelId: S.NonEmptyString,
        }),
      ),
    }),
  ),
});

export type Chat = typeof ChatsTable.Type;

export type ChatHistory = typeof ChatsTable.Type["history"];

const Database = database({
  characters: CharactersTable,
  chats: ChatsTable,
});

type Database = typeof Database.Type;

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
export interface NewChat {
  characterId: string;
  data: ChatHistoryItem[];
}

export interface NewCharacter {
  url: string | null;
  payload: CharacterPayload;
  uuid: string;
}

export class Storage {
  #evolu: Evolu<Database>;

  constructor() {
    this.#evolu = createEvolu(Database);
  }

  async getCharacter(id: CharacterId) {
    const query = this.#evolu.createQuery((db) =>
      db.selectFrom("characters").where("id", "=", id).selectAll(),
    );
    const data = await this.#evolu.loadQuery(query);
    return data.row;
  }

  async getAllCharacters() {
    const characters = this.#evolu.createQuery((db) => db.selectFrom("characters").selectAll());
    const query = await this.#evolu.loadQuery(characters);

    return query.rows;
  }

  characterExists(name: string, uuid: string, id: number): Promise<boolean> {
    throw new Error("Method not implemented.");
  }

  persistCharacters(characters: NewCharacter[]): Promise<Character[]> {
    throw new Error("Method not implemented.");
  }

  saveNewChat(chat: NewChat): Promise<number> {
    throw new Error("Method not implemented.");
  }

  updateChat(uuid: string, history: ChatHistoryItem[]): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async getAllChats() {
    const query = this.#evolu.createQuery((db) => db.selectFrom("chats").selectAll());
    const data = await this.#evolu.loadQuery(query);
    return data.rows;
  }

  async getChatsForCharacter(characterId: CharacterId) {
    const query = this.#evolu.createQuery((db) =>
      db.selectFrom("chats").where("characterId", "=", characterId).selectAll(),
    );
    const data = await this.#evolu.loadQuery(query);

    return data.rows;
  }

  async getChatById(characterId: CharacterId, chatId: ChatId) {
    const query = this.#evolu.createQuery((db) =>
      db.selectFrom("chats").where("id", "=", chatId).selectAll(),
    );
    const data = await this.#evolu.loadQuery(query);
    return data.row;
  }

  deleteChat(uuid: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  updateChatTitle(chatId: string, title: string): Promise<void> {
    throw new Error("Method not implemented.");
  }
  setChatArchived(chatId: string, archived: boolean): Promise<void> {
    throw new Error("Method not implemented.");
  }
  getConfig(): Promise<Config> {
    throw new Error("Method not implemented.");
  }
  getArchivedChats(): Promise<Chat[]> {
    throw new Error("Method not implemented.");
  }
  saveConfig(config: Config): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
