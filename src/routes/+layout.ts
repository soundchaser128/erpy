import { getConfig } from "$lib/database";
import SyncClient, { healthCheck } from "$lib/service/sync";
import type { Config } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";

export const ssr = false;

export const load = async () => {
  const config: Config = await getConfig();
  const activeModel: string | null = await invoke("active_model", { config });
  let sync = undefined;

  if (config.sync.clientId && config.sync.serverUrl) {
    const healthy = await healthCheck(config.sync.serverUrl);
    if (healthy) {
      sync = new SyncClient(config.sync.serverUrl, config.sync.clientId, 30 * 1000);
    }
  }

  if (sync) {
    sync.sync();
  }

  return {
    activeModel: activeModel || undefined,
    config,
    sync,
  };
};
