import { getAllCharacters } from "$lib/database.js";

export interface DbCharacter {
  id: number;
  url: string;
  payload: string;
}

export const load = async () => {
  const characters = await getAllCharacters();

  return {
    characters,
  };
};
