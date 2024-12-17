import { DateTime } from "luxon";

export function log(...args: unknown[]) {
  if (!import.meta.env.PROD) {
    const timestamp = DateTime.now().toFormat("[yyyy-MM-dd HH:mm:ss]");
    console.log(timestamp, ...args);
  }
}
