import { getInitialChatHistory } from "$lib/helpers";
import { CharacterId, type Chat } from "$lib/storage";
import { error, redirect } from "@sveltejs/kit";
import invariant from "tiny-invariant";

export const load = async (event) => {
  const { storage, activeModel, config } = await event.parent();
  const characterId = CharacterId.make(event.params.characterId);
  const chats = await storage.getChatsForCharacter(characterId, false);
  if (chats.length === 0) {
    invariant(!!activeModel, "No active model");

    const character = await storage.getCharacter(characterId);
    if (!character) {
      error(404, `Character with ID ${characterId} not found`);
    }

    const id = await storage.saveNewChat({
      characterId,
      data: getInitialChatHistory(character, config.userName, activeModel!),
    });
    redirect(301, `/character/${characterId}/chat/${id}`);
  } else {
    // find the chat with the most recent updatedAt timestamp
    const lastUpdatedChat = chats.reduce((acc: Chat, chat: Chat) => {
      return acc.updatedAt > chat.updatedAt ? acc : chat;
    });
    const id = lastUpdatedChat.id;

    redirect(301, `/character/${characterId}/chat/${id}`);
  }
};
