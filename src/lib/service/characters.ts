import { addCharacters, persistCharacters, type Character } from "$lib/database";
import type { CharacterPayload } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";
import { BaseDirectory, mkdir, writeFile } from "@tauri-apps/plugin-fs";

async function createDirectory(name: string, baseDir: BaseDirectory) {
  try {
    await mkdir(name, { baseDir });
  } catch (error) {
    // ignored
  }
}

export async function createCharactersFromPngs(files: FileList): Promise<Character[]> {
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
  const characterPayloads: CharacterPayload[] = await invoke("upload_character_pngs", { pngs });
  const characters = await persistCharacters(characterPayloads);

  let i = 0;
  for (const character of characters) {
    const file = files.item(i);
    if (!file) continue;
    const data = await file.arrayBuffer();
    const array = new Uint8Array(data);
    const path = character.payload.avatar!.replace("asset://", "");

    await writeFile(path, array, {
      baseDir: BaseDirectory.AppData,
    });

    i += 1;
  }

  return characters;
}

export async function createCharacterFromUrls(urls: string[]): Promise<Character[]> {
  const characters = await Promise.all(
    urls.map((url) =>
      invoke<CharacterPayload>("fetch_character", { characterUrl: url }).then((result) => ({
        url,
        payload: result,
      })),
    ),
  );

  return await addCharacters(characters);
}
