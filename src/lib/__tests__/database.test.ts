import type { Character, Chat, ChatHistoryItem } from "$lib/database";
import { describe, it } from "vitest";
import { faker } from "@faker-js/faker";
import { sqliteDateTime } from "$lib/helpers";

export function randomCharacter(): Character {
  return {
    chatCount: faker.number.int({ min: 0, max: 10 }),
    createdAt: sqliteDateTime(faker.date.recent()),
    id: faker.number.int({ min: 1 }),
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
    characterId: faker.number.int({ min: 1 }),
    createdAt: sqliteDateTime(faker.date.recent()),
    id: faker.number.int({ min: 1 }),
    updatedAt: sqliteDateTime(new Date()),
    uuid: crypto.randomUUID(),
    archived: false,
    title: faker.lorem.sentence(),
    data: randomChatContent(),
  };
}

describe("database", () => {
  it("should be able to persist characters", async () => {
    const character = randomCharacter();
  });
});
