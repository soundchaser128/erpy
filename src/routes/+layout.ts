import { setupCompleted } from "$lib/service/setup";
import { redirect } from "@sveltejs/kit";

export const ssr = false;

export const load = async (event) => {
  const isSetup = setupCompleted();
  if (!isSetup && !event.url.pathname.startsWith("/first-time-setup")) {
    console.log("First time setup not completed, redirecting to /first-time-setup");
    redirect(302, "/first-time-setup");
  } else {
    return {};
  }
};
