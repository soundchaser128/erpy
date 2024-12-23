import { log } from "./log";
import type { Character, ErpyStorage } from "./storage";

export type CharacterSubscription = {
  characters: Character[];
  state: "loading" | "error" | "success";
};

export const allCharacters: CharacterSubscription = $state({ characters: [], state: "loading" });

export function subscribeCharacters(storage: ErpyStorage) {
  log("subscribing to characters");
  const unsub = storage.subscribeAllCharacters((characters) => {
    log("received characters", characters);
    allCharacters.characters = characters;
    allCharacters.state = "success";
  });
  return unsub;
}
