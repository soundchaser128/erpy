import { fetch } from "@tauri-apps/plugin-http";
import {
  getAllCharacters,
  getAllChats,
  persistCharacters,
  saveChat,
  type Character,
  type Chat,
} from "$lib/database";
import { invalidateAll } from "$app/navigation";

const headers = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
});

export async function healthCheck(baseUrl: string, apiKey: string): Promise<boolean> {
  return fetch(`${baseUrl}/api/health`, { headers: headers(apiKey) })
    .then((res) => (res.ok ? res.json() : Promise.resolve({ status: "error" })))
    .then((res) => res.status === "ok")
    .catch(() => false);
}

export interface SyncAllPayload {
  characters: Character[];
  chats: Chat[];
}

class SyncClient {
  #baseUrl: string;
  #clientId: string;
  #apiKey: string;
  #syncInterval: number | null = null;

  constructor(
    baseUrl: string,
    clientId: string,
    apiKey: string,
    syncInterval: number | null = null,
  ) {
    this.#baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.#clientId = clientId;
    this.#syncInterval = syncInterval;
    this.#apiKey = apiKey;

    if (this.#syncInterval) {
      // this.startSync();
    }
  }

  async startSync() {
    await this.sync();

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
    const characters = await getAllCharacters();
    const chats = await getAllChats();
    const payload = {
      chats,
      characters,
    };

    const response = await fetch(this.#prepareUrl("/api/sync"), {
      headers: headers(this.#apiKey),
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed with status code ${response.status}: ${text}`);
    } else {
      const syncData: SyncAllPayload = await response.json();
      // TODO conflict resolution and batch insert
      // for (const chat of syncData.chats) {
      //   await saveChat(chat);
      // }
      // await persistCharacters(payload.characters.map(c ));

      // await invalidateAll();
    }
  }

  async storeChat(chat: Chat) {
    const response = await fetch(this.#prepareUrl("/api/chat"), {
      method: "POST",
      body: JSON.stringify(chat),
      headers: headers(this.#apiKey),
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
      headers: headers(this.#apiKey),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed with status code ${response.status}: ${text}`);
    }
  }

  async fetchChats(): Promise<Chat[]> {
    const response = await fetch(`${this.#baseUrl}/api/chat`, {
      headers: headers(this.#apiKey),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed with status code ${response.status}: ${text}`);
    }

    return response.json();
  }

  async fetchCharacters(): Promise<Character[]> {
    const response = await fetch(`${this.#baseUrl}/api/character`, {
      headers: headers(this.#apiKey),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Request failed with status code ${response.status}: ${text}`);
    }

    return response.json();
  }
}

export default SyncClient;
