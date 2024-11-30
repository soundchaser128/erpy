import { setupCompleted } from "$lib/service/setup";
import { Storage } from "$lib/storage";
import { redirect } from "@sveltejs/kit";
import { invoke } from "@tauri-apps/api/core";

export const ssr = false;

export const load = async (event) => {
  const isSetup = setupCompleted();
  if (!isSetup && !event.url.pathname.startsWith("/first-time-setup")) {
    console.log("First time setup not completed, redirecting to /first-time-setup");
    redirect(302, "/first-time-setup");
  } else {
    const storage = new Storage();
    const config = await storage.getConfig();
    const activeModel: string | null = await invoke("active_model", { config });

    return {
      activeModel: activeModel || undefined,
      config,
      storage,
    };
  }
};
