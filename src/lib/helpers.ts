import { MessageRole, type Character, type Chat, type ChatHistoryItem } from "./storage";
import { DateTime } from "luxon";

const numberFormat = new Intl.NumberFormat("en-US");
const pluralRules = new Intl.PluralRules("en-US");

export const toDateTime = (timestamp: number | Date) =>
  timestamp instanceof Date ? DateTime.fromJSDate(timestamp) : DateTime.fromMillis(timestamp);

export function formatTimestamp(timestamp: number | Date, format: "long" | "short" = "short") {
  const date = toDateTime(timestamp);
  return date.toLocaleString(format === "long" ? DateTime.DATETIME_MED : DateTime.DATETIME_SHORT);
}

export function formatTime(timestamp: number | Date) {
  const date = toDateTime(timestamp);
  return date.toLocaleString(DateTime.TIME_SIMPLE);
}

export function sqliteDateTime(date: Date): string {
  return DateTime.fromJSDate(date).toFormat("yyyy-MM-dd HH:mm:ss");
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function formatNumber(n: number): string {
  return numberFormat.format(n);
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
    character.systemPrompt,
    character.personality,
    character.description,
  ].filter((s) => s.trim().length > 0);
  let systemMessage = "";
  for (const msg of systemPrompts) {
    systemMessage += msg + "\n\n";
  }

  const messages: ChatHistoryItem[] = [
    {
      role: MessageRole.System,
      content: [
        {
          content: systemMessage,
          timestamp: new Date(),
          modelId,
        },
      ],
      chosenAnswer: 0,
    },
  ];

  messages.push({
    role: MessageRole.Assistant,
    content: character.firstMessages.map((content) => ({
      content,
      timestamp: new Date(),
      modelId,
    })),
    chosenAnswer: 0,
  });

  return messages.map((message) => ({
    ...message,
    content: message.content.map((content) => ({
      content: substituteParams(content.content, userName, character.name, content.content),
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

export function truncate(str: string | undefined | null, maxLen: number): string | undefined {
  if (str == null) {
    return undefined;
  }

  if (str.length <= maxLen) {
    return str;
  }

  return str.slice(0, maxLen - 1) + "…";
}

export function getChatTitle(chat: Chat): string {
  return (
    truncate(chat.title, 40) ||
    truncate(chat.history.at(2)?.content.at(0)?.content, 40) ||
    "Untitled"
  );
}
