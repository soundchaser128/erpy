import { log } from "./log";
import type { Character, ErpyStorage } from "./storage";

export type CharacterSubscription = {
  characters: Character[];
};

export const allCharacters: CharacterSubscription = $state({ characters: [] });

export function subscribeCharacters(storage: ErpyStorage) {
  log("subscribing to characters");
  const unsub = storage.subscribeAllCharacters((characters) => {
    log("received characters", characters);
    allCharacters.characters = characters;
  });
  return unsub;
}
