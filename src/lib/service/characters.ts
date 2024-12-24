import { type Character, type NewCharacter, type ErpyStorage } from "$lib/storage";
import type { CharacterInformation } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";

export async function createCharactersFromPngs(
  files: FileList,
  storage: ErpyStorage,
): Promise<Character[]> {
  const pngs = await Promise.all(
    Array.from(files).map(async (file) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      return new Promise<string>((resolve) => {
        reader.onload = () => {
          const string = (reader.result as string).replace("data:image/png;base64,", "");
          resolve(string);
        };
      });
    }),
  );

  const characterPayloads: CharacterInformation[] = await invoke("upload_character_pngs", { pngs });

  const newCharacters: NewCharacter[] = [];
  for (let i = 0; i < characterPayloads.length; i++) {
    const character = characterPayloads[i];

    newCharacters.push({
      payload: { ...character },
      url: null,
      imageBase64: pngs[i],
    });
  }

  return await storage.persistCharacters(newCharacters);
}

export async function createCharacterFromUrls(
  urls: string[],
  storage: ErpyStorage,
): Promise<Character[]> {
  const data = await Promise.all(
    urls.map((url) => invoke<CharacterInformation>("fetch_character", { characterUrl: url })),
  );

  return storage.persistCharacters(
    data.map((character) => ({
      imageBase64: character.image_base64!,
      payload: character,
      url: null,
    })),
  );
}
