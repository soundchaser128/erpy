import type { Character, Chat, ChatHistoryItem, NewCharacter, NewChat, Storage } from "./storage";
import type { Config } from "../types";
import * as S from "@effect/schema/Schema";
import { database, id, SqliteBoolean, table, type Evolu } from "@evolu/common";
import { createEvolu } from "@evolu/common-web";
import { th } from "@faker-js/faker";

const CharacterId = id("Character");
type CharacterId = typeof CharacterId.Type;

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

const ChatId = id("Chat");

enum MessageRole {
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

const Database = database({
  characters: CharactersTable,
  chats: ChatsTable,
});

type Database = typeof Database.Type;

export class EvoluStorage implements Storage {
  #evulu: Evolu<Database>;

  constructor() {
    this.#evulu = createEvolu(Database);
  }

  getCharacter(uuid: string): Promise<Character> {
    // return this.#evulu.createQuery((db) =>
    //   db.selectFrom("characters").where("id", "=", uuid).executeTakeFirstOrThrow(),
    // );

    const character = this.#evulu.createQuery((db) =>
      db.selectFrom("characters").selectAll().executeTakeFirstOrThrow(),
    );

    throw new Error("Method not implemented.");
  }
  getAllCharacters(): Promise<Character[]> {
    throw new Error("Method not implemented.");
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
  getAllChats(): Promise<Chat[]> {
    throw new Error("Method not implemented.");
  }
  getChatsForCharacter(characterId: string): Promise<Chat[]> {
    throw new Error("Method not implemented.");
  }
  getChatById(characterId: string, chatId: string): Promise<Chat | undefined> {
    throw new Error("Method not implemented.");
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
