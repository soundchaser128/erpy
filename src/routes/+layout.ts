import { getConfig } from "$lib/database";
import SyncClient from "$lib/service/sync";
import type { Config } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";

export const ssr = false;

export const load = async () => {
  const config: Config = await getConfig();
  const activeModel: string | null = await invoke("active_model", { config });
  const sync =
    config.sync.clientId && config.sync.serverUrl
      ? new SyncClient(config.sync.serverUrl, config.sync.clientId, 30 * 1000)
      : undefined;

  if (sync) {
    sync.sync();
  }

  return {
    activeModel: activeModel || undefined,
    config,
    sync,
  };
};
