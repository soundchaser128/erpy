import type { CharacterPayload, Config, MessageRole } from "$lib/types";

export interface Character {
  uuid: string;
  url: string | null;
  payload: CharacterPayload;
  createdAt: string;
  updatedAt: string;
  chats: Chat[];
}

export interface Chat {
  uuid: string;
  createdAt: string;
  updatedAt: string;
  title: string | null;
  characterId: string;
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
export interface NewChat {
  characterId: string;
  data: ChatHistoryItem[];
}

export interface NewCharacter {
  url: string | null;
  payload: CharacterPayload;
  uuid: string;
}

export interface Storage {
  getCharacter(uuid: string): Promise<Character>;

  getAllCharacters(): Promise<Character[]>;

  characterExists(name: string, uuid: string, id: number): Promise<boolean>;

  persistCharacters(characters: NewCharacter[]): Promise<Character[]>;

  saveNewChat(chat: NewChat): Promise<number>;

  updateChat(uuid: string, history: ChatHistoryItem[]): Promise<void>;

  getAllChats(): Promise<Chat[]>;

  getChatsForCharacter(characterId: string): Promise<Chat[]>;

  getChatById(characterId: string, chatId: string): Promise<Chat | undefined>;

  deleteChat(uuid: string): Promise<void>;

  updateChatTitle(chatId: string, title: string): Promise<void>;

  setChatArchived(chatId: string, archived: boolean): Promise<void>;

  getConfig(): Promise<Config>;

  getArchivedChats(): Promise<Chat[]>;

  saveConfig(config: Config): Promise<void>;
}
