import { setupCompleted } from "$lib/service/setup";
import { redirect } from "@sveltejs/kit";

export const load = async () => {
  const isSetup = setupCompleted();
  if (isSetup) {
    console.log("First time setup completed, redirecting to /");
    // redirect(302, "/");
  }
  return {};
};
