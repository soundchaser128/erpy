import { getChatById, getCharacter, getChatsForCharacter } from "$lib/database.js";
import { getInitialChatHistory } from "$lib/helpers";
import invariant from "tiny-invariant";

export async function load(event) {
  const data = await event.parent();
  const characterId = parseInt(event.params.characterId, 10);
  const chatId = parseInt(event.params.chatId, 10);
  const character = await getCharacter(characterId);
  const allChats = await getChatsForCharacter(characterId);

  let chat = await getChatById(characterId, chatId);
  if (chat === undefined) {
    invariant(!!data.activeModel, "No active model");
    chat = {
      id: -1,
      characterId: characterId,
      data: getInitialChatHistory(character, data.config.userName, data.activeModel),
      title: null,
      archived: false,
      createdAt: new Date().toISOString(),
      uuid: crypto.randomUUID(),
      updatedAt: new Date().toISOString(),
    };
  }
  return {
    character,
    chat,
    allChats,
  };
}
