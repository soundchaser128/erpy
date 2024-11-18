import type { CharacterPayload, Config } from "$lib/types";
import * as S from "@effect/schema/Schema";
import { cast, database, id, SqliteBoolean, SqliteDate, table, type Evolu } from "@evolu/common";
import { createEvolu } from "@evolu/common-web";

export const CharacterId = id("characters");
export type CharacterId = typeof CharacterId.Type;

type Nullable<T> = { [K in keyof T]: T[K] | null };

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

export type CharacterRow = typeof CharactersTable.Type;

export interface Character {
  id: CharacterId;
  url: string;
  name: string;
  description: string;
  personality: string;
  firstMessages: string[];
  tags: string[];
  systemPrompt: string;
  avatar: string;
  chatCount: number | null;
}

function convertCharacter(character: Nullable<CharacterRow>): Character {
  return {
    id: character.id!,
    url: character.url!,
    name: character.name!,
    description: character.description!,
    personality: character.personality!,
    firstMessages: (character.firstMessages ?? []) as string[],
    tags: (character.tags ?? []) as string[],
    systemPrompt: character.systemPrompt!,
    avatar: character.avatar!,
    chatCount: null,
  };
}

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
          timestamp: SqliteDate,
          modelId: S.NonEmptyString,
        }),
      ),
    }),
  ),
});

export type ChatRow = typeof ChatsTable.Type;

export interface ChatContent {
  content: string;
  timestamp: Date;
  modelId: string;
}

export interface ChatHistoryItem {
  role: MessageRole;
  chosenAnswer: number;
  content: ChatContent[];
}

export interface Chat {
  id: ChatId;
  createdAt: Date;
  updatedAt: Date;
  title: string | null;
  characterId: CharacterId;
  archived: boolean;
  history: ChatHistoryItem[];
}

function convertChat(chat: Nullable<ChatRow>): Chat {
  return {
    // required
    id: chat.id!,
    title: chat.title,
    characterId: chat.characterId!,
    createdAt: cast(chat.createdAt!),
    updatedAt: cast(chat.updatedAt!),
    archived: cast(chat.archived ?? SqliteBoolean.make(0)),
    history: (chat.history ?? []).map((item) => ({
      role: item.role,
      chosenAnswer: item.chosenAnswer,
      content: item.content.map((content) => ({
        content: content.content,
        timestamp: cast(content.timestamp),
        modelId: content.modelId,
      })),
    })),
  };
}

const Database = database({
  characters: CharactersTable,
  chats: ChatsTable,
});

type Database = typeof Database.Type;

export interface ChatContent {
  content: string;
  timestamp: Date;
  modelId: string;
}

export interface NewChat {
  characterId: CharacterId;
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

  async getCharacter(id: CharacterId): Promise<Character | null> {
    const query = this.#evolu.createQuery((db) =>
      db.selectFrom("characters").where("id", "=", id).selectAll(),
    );
    const data = await this.#evolu.loadQuery(query);
    if (data.row) {
      return convertCharacter(data.row);
    } else {
      return null;
    }
  }

  async getAllCharacters(): Promise<Character[]> {
    const characters = this.#evolu.createQuery((db) => db.selectFrom("characters").selectAll());
    const query = await this.#evolu.loadQuery(characters);

    return query.rows.map(convertCharacter);
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

  async getAllChats(): Promise<Chat[]> {
    const query = this.#evolu.createQuery((db) => db.selectFrom("chats").selectAll());
    const data = await this.#evolu.loadQuery(query);
    return data.rows.map(convertChat);
  }

  async getChatsForCharacter(characterId: CharacterId): Promise<Chat[]> {
    const query = this.#evolu.createQuery((db) =>
      db.selectFrom("chats").where("characterId", "=", characterId).selectAll(),
    );
    const data = await this.#evolu.loadQuery(query);

    return data.rows.map(convertChat);
  }

  async getChatById(characterId: CharacterId, chatId: ChatId): Promise<Chat | null> {
    const query = this.#evolu.createQuery((db) =>
      db.selectFrom("chats").where("id", "=", chatId).selectAll(),
    );
    const data = await this.#evolu.loadQuery(query);

    return data.row ? convertChat(data.row) : null;
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
