import type { CharacterInformation } from "$lib/types";
import * as S from "@effect/schema/Schema";
import {
  cast,
  database,
  id,
  SqliteBoolean,
  SqliteDate,
  table,
  type Evolu,
  type Mnemonic,
  type SyncState,
  type Unsubscribe,
} from "@evolu/common";
import { createEvolu } from "@evolu/common-web";
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
  id: ConfigId;
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
    id: config.id!,
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
  imageBase64: string;
  chatCount?: number;
}

function convertCharacter(character: Nullable<CharacterRow & { chatCount: number }>): Character {
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
    imageBase64: character.imageBase64!,
    chatCount: character.chatCount ?? undefined,
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
  title: S.String,
  characterId: CharacterId,
  archived: SqliteBoolean,
  history: S.Array(
    S.Struct({
      role: S.Enums(MessageRole),
      chosenAnswer: S.Number,
      content: S.Array(
        S.Struct({
          content: S.String,
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

  constructor(mnemonic: Mnemonic) {
    const serverUrl = import.meta.env.VITE_EVOLU_URL;
    log("using server url", serverUrl);

    this.#evolu = createEvolu(Database, {
      syncUrl: serverUrl,
      enableWebsocketConnection: true,
      mnemonic,
    });
  }

  get mnemonic(): string {
    return this.#evolu.getOwner()!.mnemonic;
  }

  onSyncStateChange(callback: (state: SyncState) => void): Unsubscribe {
    return this.#evolu.subscribeSyncState(() => {
      callback(this.#evolu.getSyncState());
    });
  }

  async getCharacter(id: CharacterId): Promise<Character | null> {
    const query = this.#evolu.createQuery((db) =>
      db
        .selectFrom("characters")
        .select((eb) =>
          eb
            .selectFrom("chats")
            .where("characterId", "=", id)
            .select((eb2) => eb2.fn.count<number>("chats.id").as("chatCount"))
            .as("chatCount"),
        )
        .where("id", "=", id)
        .selectAll(),
    );
    const data = await this.#evolu.loadQuery(query);
    if (data.row) {
      return convertCharacter(data.row);
    } else {
      return null;
    }
  }

  #allCharactersQuery() {
    return this.#evolu.createQuery((db) =>
      db
        .selectFrom("characters")
        .selectAll()
        .select((eb) =>
          eb
            .selectFrom("chats")
            .whereRef("chats.characterId", "=", "characters.id")
            .select((eb2) => eb2.fn.count<number>("chats.id").as("chatCount"))
            .as("chatCount"),
        ),
    );
  }

  async getAllCharacters(): Promise<Character[]> {
    const characters = this.#allCharactersQuery();
    const query = await this.#evolu.loadQuery(characters);

    return query.rows.map(convertCharacter);
  }

  subscribeAllCharacters(callback: (characters: Character[]) => void): Unsubscribe {
    const characters = this.#allCharactersQuery();
    const subscription = this.#evolu.subscribeQuery(characters);
    const unsub = subscription(() => {
      const result = this.#evolu.getQuery(characters);
      if (result) {
        callback(result.rows.map(convertCharacter));
      }
    });

    return unsub;
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

  async getChatsForCharacter(characterId: CharacterId, archived?: boolean): Promise<Chat[]> {
    const query = this.#evolu.createQuery((db) => {
      const builder = db.selectFrom("chats").where("characterId", "=", characterId);
      if (archived !== undefined) {
        builder.where("archived", "=", cast(archived));
      }
      return builder.selectAll();
    });
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
        id: ConfigId.make("sM858XXzjqpAwIMMKAncq"),
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
      id: config.id,
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
