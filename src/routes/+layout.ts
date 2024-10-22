import { getConfig } from "$lib/database";
import type { Config } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";

export const ssr = false;

export const load = async () => {
  const config: Config = await getConfig();
  const activeModel: string | null = await invoke("active_model", { config });
  return {
    activeModel: activeModel || undefined,
    config,
  };
};
