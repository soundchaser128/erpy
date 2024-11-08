import { type Character, type NewCharacter, type Storage } from "$lib/storage/storage";
import type { CharacterPayload } from "$lib/types";
import { invoke } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
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
  storage: Storage,
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
  const directory = await appDataDir();

  await createDirectory("avatars", BaseDirectory.AppData);
  const characterPayloads: CharacterPayload[] = await invoke("upload_character_pngs", { pngs });

  const newCharacters: NewCharacter[] = [];
  for (const character of characterPayloads) {
    const uuid = crypto.randomUUID();
    const path = await join(directory, "avatars", `${character.name} - ${uuid}.png`);
    const avatarUrl = "asset://" + path;
    newCharacters.push({
      payload: { ...character, avatar: avatarUrl },
      url: null,
      uuid,
    });
  }

  const characters = await storage.persistCharacters(newCharacters);

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

export async function createCharacterFromUrls(
  urls: string[],
  storage: Storage,
): Promise<Character[]> {
  const characters = await Promise.all(
    urls.map((url) =>
      invoke<CharacterPayload>("fetch_character", { characterUrl: url }).then((result) => ({
        url,
        payload: result,
        uuid: crypto.randomUUID(),
      })),
    ),
  );

  return await storage.persistCharacters(characters);
}
