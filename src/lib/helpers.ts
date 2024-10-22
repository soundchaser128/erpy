import { convertFileSrc } from "@tauri-apps/api/core";
import type { Character, ChatHistoryItem } from "./database";

const pluralRules = new Intl.PluralRules("en-US");

export function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleDateString();
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function substituteParams(
  content: string,
  userName: string,
  characterName: string,
  original: string,
): string {
  return content
    .replaceAll("{{user}}", userName)
    .replaceAll("{{char}}", characterName)
    .replaceAll("{{Char}}", characterName)
    .replaceAll("<BOT>", characterName)
    .replaceAll("<USER>", userName)
    .replaceAll("{{original}}", original);
}

export function getInitialChatHistory(
  character: Character,
  userName: string,
  modelId: string,
): ChatHistoryItem[] {
  const systemPrompts = [
    character.data.system_prompt,
    character.data.personality,
    character.data.description,
  ].filter((s) => s.trim().length > 0);
  let systemMessage = "";
  for (const msg of systemPrompts) {
    systemMessage += msg + "\n\n";
  }

  const messages: ChatHistoryItem[] = [
    {
      role: "system",
      content: [
        {
          content: systemMessage,
          timestamp: Date.now(),
          modelId,
        },
      ],
      chosenAnswer: 0,
    },
  ];

  messages.push({
    role: "assistant",
    content: character.data.first_messages.map((content) => ({
      content,
      timestamp: Date.now(),
      modelId,
    })),
    chosenAnswer: 0,
  });

  return messages.map((message) => ({
    ...message,
    content: message.content.map((content) => ({
      content: substituteParams(content.content, userName, character.data.name, content.content),
      timestamp: content.timestamp,
      modelId,
    })),
  }));
}

export function pluralize(count: number, singular: string, plural: string) {
  const grammaticalNumber = pluralRules.select(count);
  switch (grammaticalNumber) {
    case "one":
      return singular;
    case "other":
      return plural;
    default:
      throw new Error("Unknown: " + grammaticalNumber);
  }
}

export function getAvatar(url: string | undefined): string {
  if (!url) {
    return "";
  }

  if (url.startsWith("http")) {
    return url;
  } else {
    return convertFileSrc(url.replace("asset://", ""));
  }
}

export function truncate(str: string | undefined | null, maxLen: number): string | undefined {
  if (str == null) {
    return undefined;
  }

  if (str.length <= maxLen) {
    return str;
  }

  return str.slice(0, maxLen - 1) + "…";
}
