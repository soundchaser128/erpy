export const load = async (event) => {
  const { storage } = await event.parent();
  const chats = await storage.getArchivedChats();
  const characters = await storage.getAllCharacters();

  return { chats, characters };
};
