import { log } from "$lib/log";
import { setupCompleted } from "$lib/service/setup";
import { redirect } from "@sveltejs/kit";

export const load = async () => {
  const isSetup = setupCompleted();
  if (isSetup) {
    log("First time setup completed, redirecting to /");
    redirect(302, "/");
  }
  return {};
};
