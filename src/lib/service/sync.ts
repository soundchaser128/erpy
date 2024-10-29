import { fetch } from "@tauri-apps/plugin-http";
import { persistCharacters, saveChatHistory, type Character, type Chat } from "$lib/database";

export async function healthCheck(baseUrl: string): Promise<boolean> {
  return fetch(`${baseUrl}/api/health`)
    .then((res) => (res.ok ? res.json() : Promise.resolve({ status: "error" })))
    .then((res) => res.status === "ok")
    .catch(() => false);
}

class SyncClient {
  #baseUrl: string;
  #clientId: string;
  #syncInterval: number | null = null;

  constructor(baseUrl: string, clientId: string, syncInterval: number | null = null) {
    this.#baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.#clientId = clientId;
    this.#syncInterval = syncInterval;

    if (this.#syncInterval) {
      this.startSync();
    }
  }

  startSync() {
    if (this.#syncInterval) {
      this.#syncInterval = setInterval(() => {
        this.sync();
      }, this.#syncInterval);
    }
  }

  #prepareUrl(path: string): string {
    return `${this.#baseUrl}${path}?client_id=${encodeURIComponent(this.#clientId)}`;
  }

  async sync() {
    const characters = await this.fetchCharacters();
    await persistCharacters(characters.map((c) => c.payload));

    // const chats = await this.fetchChats();
    // for (const chat of chats) {
    //   await saveChatHistory(chat.id, chat.data);
    // }
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
