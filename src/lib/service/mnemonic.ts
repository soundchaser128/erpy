import { parseMnemonic, type Mnemonic } from "@evolu/common";
import * as Effect from "effect/Effect";

const localStorageKey = "evoluMnemonic";

export function loadMnemonic(): Mnemonic | undefined {
  const string = window.localStorage.getItem(localStorageKey);

  if (string) {
    return Effect.runSync(parseMnemonic(string));
  } else {
    throw new Error("No mnemonic found in localStorge");
  }
}

export function storeMnemonic(m: Mnemonic | string) {
  window.localStorage.setItem(localStorageKey, m);
}
