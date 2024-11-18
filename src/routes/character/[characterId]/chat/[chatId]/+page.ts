import { CharacterId, ChatId } from "$lib/storage";
import { error } from "@sveltejs/kit";
import invariant from "tiny-invariant";

export async function load(event) {
  const { storage } = await event.parent();
  const characterId = CharacterId.make(event.params.characterId);
  const chatId = ChatId.make(event.params.chatId);
  const character = await storage.getCharacter(characterId);
  const allChats = await storage.getChatsForCharacter(characterId);

  const chat = await storage.getChatById(characterId, chatId);
  if (chat === null) {
    error(404, `Chat with ID ${chatId} not found`);
  } else {
    return {
      character,
      chat,
      allChats,
    };
  }
}
