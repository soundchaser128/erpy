import { invoke } from "@tauri-apps/api/core";

export interface ModelInfo {
  user: string;
  name: string;
  path: string;
}

export const load = async (event) => {
  const modelsOnDisk = await invoke<ModelInfo[]>("list_models_on_disk");

  return { modelsOnDisk };
};
