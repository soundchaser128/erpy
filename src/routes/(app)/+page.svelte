<script lang="ts">
  import Fa from "svelte-fa";
  import { faPlus, faFileImport, faWarning, faBoxArchive } from "@fortawesome/free-solid-svg-icons";
  import { invalidateAll } from "$app/navigation";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import ExternalLink from "$lib/components/ExternalLink.svelte";
  import { createCharacterFromUrls, createCharactersFromPngs } from "$lib/service/characters";
  import type { Character } from "$lib/storage.js";
  import { pluralize } from "$lib/helpers.js";
  import { allCharacters, subscribeCharacters } from "$lib/subscriptions.svelte";

  let { data } = $props();
  let addModal: HTMLDialogElement | undefined = $state();
  let textInput = $state("");
  let searchInput = $state("");
  let loading = $state(false);
  let files: FileList | undefined = $state();
  let characters = $state(data.characters);

  $inspect(characters);

  let filtered = $derived(
    searchInput.trim()
      ? characters.filter((character) =>
          character.name.toLowerCase().includes(searchInput.toLowerCase()),
        )
      : characters,
  );

  $effect(() => {
    const unsub = subscribeCharacters(data.storage);
    if (allCharacters.state === "success") {
      characters = allCharacters.characters;
    }
    return unsub;
  });

  function showModal() {
    addModal?.showModal();
  }

  async function addCharactersFromUrls(event: Event) {
    event.preventDefault();
    const urls = textInput.split("\n").map((url) => url.trim());
    if (urls.length === 0) {
      return;
    }
    loading = true;
    addModal?.close();

    await createCharacterFromUrls(urls, data.storage);
    await invalidateAll();

    files = undefined;
    loading = false;
  }

  async function addCharactersFromImages(event: Event) {
    event.preventDefault();
    if (!files) return;

    loading = true;
    addModal?.close();

    await createCharactersFromPngs(files, data.storage);
    await invalidateAll();

    textInput = "";
    loading = false;
  }

  function isDisabled(character: Character): boolean {
    return !data.activeModel && character.chatCount === 0;
  }
</script>

<dialog bind:this={addModal} class="modal">
  <div class="modal-box">
    <div class="flex flex-col">
      <h3 class="text-lg font-bold">Import characters</h3>
      <form onsubmit={addCharactersFromUrls} class="flex w-full flex-col gap-4">
        <div class="form-control">
          <label class="label" for="character-urls">
            <span class="label-text"
              >Enter character URL(s) (currently supports <ExternalLink href="https://chub.ai/"
                >chub.ai</ExternalLink
              >)</span
            >
          </label>
          <textarea
            id="character-urls"
            bind:value={textInput}
            class="textarea textarea-primary"
            rows={5}
            placeholder="https://chub.ai/characters/..."
          ></textarea>
        </div>
        <button disabled={textInput.length === 0} type="submit" class="btn btn-primary self-end">
          <Fa icon={faPlus} />
          Add</button
        >
      </form>
      <div class="divider">OR</div>

      <form onsubmit={addCharactersFromImages} class="flex w-full flex-col gap-4">
        <label class="form-control w-full max-w-sm self-center">
          <div class="label">
            <span class="label-text">Upload one or more PNG character cards (version 2).</span>
          </div>
          <input
            bind:files
            type="file"
            class="file-input file-input-bordered w-full max-w-xs self-center"
            accept="image/png"
            multiple
          />
        </label>

        <button disabled={!files?.length} type="submit" class="btn btn-primary self-end">
          <Fa icon={faFileImport} />
          Upload</button
        >
      </form>
    </div>
  </div>

  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>

<TopMenu modelName={data.activeModel}>
  {#snippet breadcrumbs()}
    <ul>
      <li>Home</li>
    </ul>
  {/snippet}
  {#snippet right()}
    <a href="/archive" class="btn btn-secondary btn-sm">
      <Fa icon={faBoxArchive} />
      Archive
    </a>
  {/snippet}
</TopMenu>

{#if !data.activeModel}
  <div role="alert" class="alert alert-warning mb-4">
    <Fa icon={faWarning} />
    <span>
      No model loaded. Load a model or connect to an API from <a class="link" href="/models">here</a
      >.
    </span>
  </div>
{/if}

<div class="mb-4 flex items-center gap-2">
  <input
    bind:value={searchInput}
    type="search"
    class="input input-primary w-full"
    placeholder="Search characters"
  />
  <button onclick={showModal} class="btn btn-success">
    <Fa icon={faFileImport} /> Import characters
  </button>
</div>
{#if !loading}
  <section class="mb-4 grid w-full grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
    {#each filtered as character (character.id)}
      <a
        href={isDisabled(character) ? undefined : `/character/${character.id}/chat`}
        class="card card-compact w-full bg-base-100 shadow-xl"
        data-sveltekit-preload-data="off"
      >
        <figure class="aspect-square">
          <img
            class="w-full rounded-t-lg object-contain {isDisabled(character)
              ? 'blur-sm grayscale'
              : ''}"
            src={character.imageBase64}
            alt={character.name}
          />
        </figure>
        <div class="card-body">
          <h2 class="card-title">
            {character.name}
          </h2>
          <p class="text-sm text-base-content">
            <strong>{character.chatCount ?? 0}</strong>
            {pluralize(character.chatCount ?? 0, "chat", "chats")}
          </p>
        </div>
      </a>
    {/each}
  </section>
{:else}
  <span class="loading loading-spinner loading-lg self-center py-8"></span>
{/if}

{#if characters.length === 0 && !loading}
  <div class="hero bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-2xl font-bold">No characters yet.</h1>
        <p class="py-6">Add a character to start chatting.</p>
        <button onclick={showModal} class="btn btn-success">
          <Fa icon={faFileImport} />
          Import characters</button
        >
      </div>
    </div>
  </div>
{/if}
