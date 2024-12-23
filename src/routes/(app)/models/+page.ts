import { invoke } from "@tauri-apps/api/core";

export const load = async () => {
  const backends = await invoke<string[]>("get_backends");

  return { backends };
};
