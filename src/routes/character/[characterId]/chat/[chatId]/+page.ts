import { getChatById, getCharacter, getChatsForCharacter } from "$lib/database.js";
import { error } from "@sveltejs/kit";

export async function load(event) {
  const characterId = event.params.characterId;
  const chatId = event.params.chatId;
  const character = await getCharacter(characterId);
  const allChats = await getChatsForCharacter(characterId);

  const chat = await getChatById(characterId, chatId);
  if (chat === undefined) {
    error(404, `Chat with ID ${chatId} not found`);
  } else {
    return {
      character,
      chat,
      allChats,
    };
  }
}
