import type { Character, Chat, ChatHistoryItem } from "$lib/storage/storage";
import { describe, it } from "vitest";
import { faker } from "@faker-js/faker";
import { sqliteDateTime } from "$lib/helpers";

export function randomCharacter(): Character {
  return {
    createdAt: sqliteDateTime(faker.date.recent()),
    updatedAt: sqliteDateTime(new Date()),
    uuid: crypto.randomUUID(),
    payload: {
      description: faker.lorem.sentence(),
      first_messages: [faker.lorem.sentence(), faker.lorem.sentence(), faker.lorem.sentence()],
      name: faker.person.fullName(),
      personality: faker.lorem.sentence(),
      system_prompt: "You're speaking to a chatbot.",
      tags: [],
      avatar: faker.image.avatar(),
    },
    url: faker.internet.url(),
    chats: [randomChat(), randomChat(), randomChat()],
  };
}

export function randomChatContent(): ChatHistoryItem[] {
  const count = faker.number.int({ min: 2, max: 30 });
  const messages: ChatHistoryItem[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      role: i % 2 === 0 ? "assistant" : "user",
      content: [
        {
          content: faker.lorem.sentence(),
          timestamp: Date.now(),
          modelId: crypto.randomUUID(),
        },
      ],
      chosenAnswer: 0,
    });
  }
  return messages;
}

export function randomChat(): Chat {
  return {
    uuid: crypto.randomUUID(),
    createdAt: sqliteDateTime(faker.date.recent()),
    updatedAt: sqliteDateTime(new Date()),
    archived: false,
    title: faker.lorem.sentence(),
    data: randomChatContent(),
    characterId: crypto.randomUUID(),
  };
}

describe("database", () => {
  it("should be able to persist characters", async () => {
    const character = randomCharacter();
  });
});
