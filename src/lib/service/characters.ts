import { type Character, type NewCharacter, type ErpyStorage } from "$lib/storage";
import type { CharacterInformation } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory, mkdir, writeFile } from "@tauri-apps/plugin-fs";

async function createDirectory(name: string, baseDir: BaseDirectory) {
  try {
    await mkdir(name, { baseDir });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // ignored
  }
}

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

  await createDirectory("avatars", BaseDirectory.AppData);
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

  const characters = await storage.persistCharacters(newCharacters);

  let i = 0;
  for (const character of characters) {
    const file = files.item(i);
    if (!file) continue;
    const data = await file.arrayBuffer();
    const array = new Uint8Array(data);
    const path = character.avatar.replace("asset://", "");

    await writeFile(path, array, {
      baseDir: BaseDirectory.AppData,
    });

    i += 1;
  }

  return characters;
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
