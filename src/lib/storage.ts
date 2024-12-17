import type { CharacterInformation } from "$lib/types";
import * as S from "@effect/schema/Schema";
import { cast, database, id, SqliteBoolean, SqliteDate, table, type Evolu } from "@evolu/common";
import { createEvolu } from "@evolu/common-web";
import { parseMnemonic } from "@evolu/common";
import * as Effect from "effect/Effect";
import { log } from "./log";

const ConfigId = id("config");
export type ConfigId = typeof ConfigId.Type;

export interface SyncSettings {
  serverUrl: string | null;
  clientId: string | null;
  apiKey: string | null;
}

export interface LlmSettings {
  maxTokens: number | null;
  temperature: number | null;
  frequencyPenalty: number | null;
  presencePenalty: number | null;
  repeatPenalty: number | null;
  topP: number | null;
  seed: number | null;
}

export interface NotificationSettings {
  newMessage: boolean;
}

export interface Config {
  userName: string;
  notifications: NotificationSettings;
  sync: SyncSettings;
  llm: LlmSettings;
}

const ConfigTable = table({
  id: ConfigId,
  data: S.Struct({
    userName: S.NonEmptyString,
    notifications: S.Struct({
      newMessage: S.Boolean,
    }),
    sync: S.Struct({
      serverUrl: S.NullOr(S.String),
      clientId: S.NullOr(S.String),
      apiKey: S.NullOr(S.String),
    }),
    llm: S.Struct({
      maxTokens: S.NullOr(S.Number),
      temperature: S.NullOr(S.Number),
      frequencyPenalty: S.NullOr(S.Number),
      presencePenalty: S.NullOr(S.Number),
      repeatPenalty: S.NullOr(S.Number),
      topP: S.NullOr(S.Number),
      seed: S.NullOr(S.Number),
    }),
  }),
});

type ConfigRow = typeof ConfigTable.Type;

function convertConfig(config: Nullable<ConfigRow>): Config {
  return {
    userName: config.data?.userName ?? "User",
    notifications: config.data?.notifications ?? { newMessage: false },
    sync: config.data?.sync ?? {
      apiKey: null,
      clientId: null,
      serverUrl: null,
    },
    llm: config.data?.llm ?? {
      maxTokens: 350,
      temperature: 0.8,
      frequencyPenalty: null,
      presencePenalty: null,
      repeatPenalty: null,
      seed: null,
      topP: null,
    },
  };
}

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
  imageBase64: S.String,
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
  imageBase64: string;
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
    imageBase64: character.imageBase64!,
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

function convertHistory(history: ChatHistoryItem[]) {
  return history.map((item) => ({
    role: item.role,
    chosenAnswer: item.chosenAnswer,
    content: item.content.map((content) => ({
      content: content.content,
      timestamp: cast(content.timestamp),
      modelId: content.modelId,
    })),
  }));
}

const Database = database({
  characters: CharactersTable,
  chats: ChatsTable,
  config: ConfigTable,
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
  payload: CharacterInformation;
  imageBase64: string;
}

export class ErpyStorage {
  #evolu: Evolu<Database>;

  constructor(mnemonic: string) {
    const serverUrl = import.meta.env.VITE_EVOLU_URL;
    log("using server url", serverUrl);

    this.#evolu = createEvolu(Database, {
      syncUrl: serverUrl,
      // minimumLogLevel: "debug",
      enableWebsocketConnection: true,
      mnemonic: mnemonic ? Effect.runSync(parseMnemonic(mnemonic)) : undefined,
    });

    this.#evolu.subscribeOwner(() => {
      log("Owner changed", this.#evolu.getOwner());
    });

    this.#evolu.subscribeSyncState(() => {
      log("Sync state changed", this.#evolu.getSyncState());
    });
  }

  get mnemonic(): string {
    return this.#evolu.getOwner()!.mnemonic;
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

  async persistCharacters(characters: NewCharacter[]): Promise<Character[]> {
    const inserted: Character[] = [];
    for (const character of characters) {
      const toInsert = {
        url: character.url!,
        name: character.payload.name,
        personality: character.payload.personality,
        avatar: character.payload.avatar!,
        description: character.payload.description,
        firstMessages: character.payload.first_messages,
        tags: character.payload.tags,
        systemPrompt: character.payload.system_prompt,
        imageBase64: character.imageBase64,
      };
      const data = this.#evolu.create("characters", toInsert);
      inserted.push({
        ...toInsert,
        chatCount: 0,
        id: data.id,
      });
    }

    return inserted;
  }

  async saveNewChat(chat: NewChat): Promise<ChatId> {
    const data = this.#evolu.create("chats", {
      archived: false,
      characterId: chat.characterId,
      history: convertHistory(chat.data),
      title: "",
    });

    return data.id;
  }

  async updateChat(id: ChatId, history: ChatHistoryItem[]): Promise<void> {
    this.#evolu.update("chats", { id, history: convertHistory(history) });
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

  async deleteChat(id: ChatId): Promise<void> {
    this.#evolu.update("chats", { id, isDeleted: true });
  }

  async updateChatTitle(chatId: string, title: string): Promise<void> {
    this.#evolu.update("chats", { id: ChatId.make(chatId), title });
  }

  async setChatArchived(chatId: string, archived: boolean): Promise<void> {
    this.#evolu.update("chats", { id: ChatId.make(chatId), archived });
  }

  async getConfig(): Promise<Config> {
    const query = this.#evolu.createQuery((db) => db.selectFrom("config").selectAll());
    const data = await this.#evolu.loadQuery(query);
    if (data.row) {
      return convertConfig(data.row);
    } else {
      return {
        userName: "User",
        notifications: {
          newMessage: true,
        },
        sync: {
          apiKey: null,
          clientId: null,
          serverUrl: null,
        },
        llm: {
          temperature: 0.8,
          frequencyPenalty: null,
          maxTokens: null,
          presencePenalty: null,
          repeatPenalty: null,
          seed: null,
          topP: null,
        },
      };
    }
  }

  async getArchivedChats(): Promise<Chat[]> {
    const query = this.#evolu.createQuery((db) =>
      db.selectFrom("chats").where("archived", "==", cast(true)).selectAll(),
    );
    const data = await this.#evolu.loadQuery(query);
    return data.rows.map(convertChat);
  }

  async saveConfig(config: Config): Promise<void> {
    this.#evolu.createOrUpdate("config", {
      id: ConfigId.make(""),
      data: {
        llm: config.llm,
        notifications: config.notifications,
        sync: config.sync,
        userName: config.userName,
      },
    });
  }

  async resetData() {
    await this.#evolu.resetOwner({ reload: false });
  }
}
