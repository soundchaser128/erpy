import { getAllCharacters, getArchivedChats } from "$lib/database.js";

export const load = async () => {
  const chats = await getArchivedChats();
  const characters = await getAllCharacters();

  return { chats, characters };
};
