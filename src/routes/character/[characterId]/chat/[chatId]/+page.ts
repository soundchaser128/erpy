import { error } from "@sveltejs/kit";

export async function load(event) {
  const { storage } = await event.parent();
  const characterId = event.params.characterId;
  const chatId = event.params.chatId;
  const character = await storage.getCharacter(characterId);
  const allChats = await storage.getChatsForCharacter(characterId);

  const chat = await storage.getChatById(characterId, chatId);
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
