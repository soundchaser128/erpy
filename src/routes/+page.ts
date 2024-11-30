export const load = async (event) => {
  const { storage } = await event.parent();
  const characters = await storage.getAllCharacters();

  return {
    characters,
  };
};
