import type { Character, NewCharacter, NewChat, ChatHistoryItem, Chat } from "$lib/storage/storage";
import type { Config } from "$lib/types";
import { type Storage } from "./storage";

export class SqliteStorage implements Storage {
  getCharacter(uuid: string): Promise<Character> {
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
