import type { ChatHistoryItem, MessageRole } from "./storage";

export interface CompletionResponse {
  choices: CompletionChoice[];
}

export interface CompletionChoice {
  delta: DeltaContent;
}

export interface DeltaContent {
  content: string;
}

export interface MessageHistoryItem {
  role: MessageRole;
  content: string;
}

export interface CharacterInformation {
  name: string;
  description: string;
  personality: string;
  first_messages: string[];
  tags: string[];
  system_prompt: string;
  avatar?: string;
  image_base64: string;
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

export type LoadModel =
  | {
      type: "open-ai";
      apiUrl: string;
      apiKey?: string;
      model: string;
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
      models: string[];
    }
  | {
      type: "failure";
      error: string;
    };
