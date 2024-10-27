import { fetch } from "@tauri-apps/plugin-http";
import type { Character, Chat } from "$lib/database";

class SyncClient {
  #baseUrl: string;
  #clientId: string;

  constructor(baseUrl: string, clientId: string) {
    this.#baseUrl = baseUrl;
    this.#clientId = clientId;
  }

  #prepareUrl(path: string): string {
    return `${this.#baseUrl}/${path}?clientId=${encodeURIComponent(this.#clientId)}`;
  }

  async storeChat(chat: Chat) {
    const response = await fetch(this.#prepareUrl("/api/chat"), {
      method: "POST",
      body: JSON.stringify(chat),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed with status code ${response.status}: ${text}`);
    }
  }

  async storeCharacter(character: Character) {
    const response = await fetch(this.#prepareUrl("/api/character"), {
      method: "POST",
      body: JSON.stringify(character),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed with status code ${response.status}: ${text}`);
    }
  }

  async fetchChats(): Promise<Chat[]> {
    const response = await fetch(`${this.#baseUrl}/api/chat`);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed with status code ${response.status}: ${text}`);
    }

    return response.json();
  }

  async fetchCharacters(): Promise<Character[]> {
    const response = await fetch(`${this.#baseUrl}/api/character`);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed with status code ${response.status}: ${text}`);
    }

    return response.json();
  }
}

export default SyncClient;
