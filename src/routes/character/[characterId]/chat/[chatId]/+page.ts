import { getChatById, getCharacter, getChatsForCharacter } from "$lib/database.js";
import { error } from "@sveltejs/kit";

export async function load(event) {
  const characterId = parseInt(event.params.characterId, 10);
  const chatId = parseInt(event.params.chatId, 10);
  const character = await getCharacter(characterId);
  const allChats = await getChatsForCharacter(characterId);

  const chat = await getChatById(characterId, chatId);
  if (chat === undefined) {
    error(404, "Chat not found");
  } else {
    return {
      character,
      chat,
      allChats,
    };
  }
}
