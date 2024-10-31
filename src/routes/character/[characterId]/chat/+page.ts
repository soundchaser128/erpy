import { getCharacter, getChatsForCharacter, saveNewChat } from "$lib/database";
import { getInitialChatHistory } from "$lib/helpers";
import { redirect } from "@sveltejs/kit";
import invariant from "tiny-invariant";

export const load = async (event) => {
  const data = await event.parent();
  const characterId = parseInt(event.params.characterId, 10);
  const chats = await getChatsForCharacter(characterId);
  if (chats.length === 0) {
    invariant(!!data.activeModel, "No active model");

    const character = await getCharacter(characterId);
    const id = await saveNewChat({
      characterId,
      data: getInitialChatHistory(character, data.config.userName, data.activeModel!),
    });
    redirect(301, `/character/${characterId}/chat/${id}`);
  } else {
    redirect(301, `/character/${characterId}/chat/${chats[0].id}`);
  }
};
