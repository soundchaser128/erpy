import { loadMnemonic } from "$lib/service/mnemonic";
import { ErpyStorage } from "$lib/storage";
import { invoke } from "@tauri-apps/api/core";

export const load = async () => {
  const mnemonic = loadMnemonic();
  const storage = new ErpyStorage(mnemonic);
  const config = await storage.getConfig();
  const activeModel: string | null = await invoke("active_model", { config });

  return {
    activeModel: activeModel || undefined,
    config,
    storage,
  };
};
