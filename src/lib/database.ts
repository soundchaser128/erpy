import type { CharacterPayload, Config, MessageRole } from "./types";

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

export async function getCharacter(uuid: string): Promise<Character> {
  throw new Error("Not implemented");
}

export async function getAllCharacters(): Promise<Character[]> {
  throw new Error("Not implemented");
}

export interface NewCharacter {
  url: string | null;
  payload: CharacterPayload;
  uuid: string;
}

export async function characterExists(name: string, uuid: string, id: number): Promise<boolean> {
  throw new Error("Not implemented");
}

export async function persistCharacters(characters: NewCharacter[]): Promise<Character[]> {
  throw new Error("Not implemented");
}
export interface NewChat {
  characterId: string;
  data: ChatHistoryItem[];
}

export async function saveNewChat(chat: NewChat): Promise<number> {
  throw new Error("Not implemented");
}

export async function updateChat(uuid: string, history: ChatHistoryItem[]) {
  throw new Error("Not implemented");
}

export async function getAllChats(): Promise<Chat[]> {
  throw new Error("Not implemented");
}

export async function getChatsForCharacter(characterId: string): Promise<Chat[]> {
  throw new Error("Not implemented");
}

export async function getChatById(characterId: string, chatId: string): Promise<Chat | undefined> {
  throw new Error("Not implemented");
}

export async function deleteChat(uuid: string) {
  throw new Error("Not implemented");
}

export async function updateChatTitle(chatId: string, title: string) {
  throw new Error("Not implemented");
}

export async function setChatArchived(chatId: string, archived: boolean) {
  throw new Error("Not implemented");
}

export async function getConfig(): Promise<Config> {
  throw new Error("Not implemented");
}

export async function getArchivedChats(): Promise<Chat[]> {
  throw new Error("Not implemented");
}

export function getDefaultConfig(): Config {
  return {
    userName: "User",
    notifications: {
      newMessage: false,
    },
    llm: {
      temperature: 0.8,
      maxTokens: 250,
    },
    sync: {},
  } satisfies Config;
}

export async function saveConfig(config: Config) {
  throw new Error("Not implemented");
}

export async function backupDatabase() {
  throw new Error("Not implemented");
}
