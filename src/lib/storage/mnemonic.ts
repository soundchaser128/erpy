import { parseMnemonic, type Mnemonic } from "@evolu/common";
import * as Effect from "effect/Effect";

const localStorageKey = "evoluMnemonic";

export function loadMnemonic(): Mnemonic | undefined {
  const string = window.localStorage.getItem(localStorageKey);

  if (string) {
    try {
      return Effect.runSync(parseMnemonic(string));
    } catch (e) {
      console.error("failed to parse mnemonic:", e);
      return undefined;
    }
  } else {
    return undefined;
  }
}

export function storeMnemonic(m: Mnemonic | string) {
  window.localStorage.setItem(localStorageKey, m);
}
