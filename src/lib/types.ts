import type { ChatHistoryItem } from "./database";

export interface CompletionResponse {
  choices: CompletionChoice[];
}

export interface CompletionChoice {
  delta: DeltaContent;
}

export interface DeltaContent {
  content: string;
}

export type MessageRole = "user" | "assistant" | "system";

export interface MessageHistoryItem {
  role: MessageRole;
  content: string;
}

export interface CharacterPayload {
  name: string;
  description: string;
  personality: string;
  first_messages: string[];
  tags: string[];
  system_prompt: string;
  avatar?: string;
}

export function toApiRequest(chat: ChatHistoryItem[]): MessageHistoryItem[] {
  return chat
    .map((item) => {
      return {
        role: item.role,
        content: item.content[item.chosenAnswer].content,
      };
    })
    .filter((i) => i.content.length > 0);
}

export interface Config {
  apiUrl: string;
  apiKey?: string;
  userName: string;
  notifications: NotificationsConfig;
  firstTimeSetupCompleted: boolean;

  // LLM settings
  maxTokens?: number;
  temperature?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  repeatPenalty?: number;
  topP?: number;
  seed?: number;
}

export interface NotificationsConfig {
  newMessage: boolean;
}

export type LoadModel =
  | {
      type: "open-ai";
      apiUrl: string;
      apiKey?: string;
    }
  | {
      type: "mistral";
      modelId: string;
      chatTemplate?: string;
      fileName: string;
    };

export type ConnectionTestResult =
  | {
      type: "success";
    }
  | {
      type: "failure";
      error: string;
    };
