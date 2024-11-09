// import { getCharacter, getChatsForCharacter, saveNewChat } from "$lib/database";
import { getInitialChatHistory } from "$lib/helpers";
import { redirect } from "@sveltejs/kit";
import invariant from "tiny-invariant";

export const load = async (event) => {
  const { storage, activeModel, config } = await event.parent();
  const characterId = event.params.characterId;
  const chats = await storage.getChatsForCharacter(characterId);
  if (chats.length === 0) {
    invariant(!!activeModel, "No active model");

    const character = await storage.getCharacter(characterId);
    const id = await storage.saveNewChat({
      characterId,
      data: getInitialChatHistory(character, config.userName, activeModel!),
    });
    redirect(301, `/character/${characterId}/chat/${id}`);
  } else {
    redirect(301, `/character/${characterId}/chat/${chats[0].uuid}`);
  }
};
