import { redirect } from "@sveltejs/kit";
import { invoke } from "@tauri-apps/api/core";

export const load = async (event) => {
  const data = await event.parent();
  const backends = await invoke<string[]>("get_backends");

  if (backends.length === 1 && backends.includes("open-ai") && !data.config.experimental.localLlm) {
    redirect(302, "/models/openai");
  } else {
    return { backends };
  }
};
