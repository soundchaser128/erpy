import { SqliteStorage } from "$lib/storage/sqlite";
import { invoke } from "@tauri-apps/api/core";

export const ssr = false;

export const load = async () => {
  const storage = new SqliteStorage();
  const config = await storage.getConfig();
  const activeModel: string | null = await invoke("active_model", { config });

  return {
    activeModel: activeModel || undefined,
    config,
    storage,
  };
};
