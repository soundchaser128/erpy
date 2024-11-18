import { Storage } from "$lib/storage";
import { invoke } from "@tauri-apps/api/core";

export const ssr = false;

export const load = async () => {
  const storage = new Storage();
  const config = await storage.getConfig();
  const activeModel: string | null = await invoke("active_model", { config });

  return {
    activeModel: activeModel || undefined,
    config,
    storage,
  };
};
