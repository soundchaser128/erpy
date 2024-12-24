<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import ExternalLink from "$lib/components/ExternalLink.svelte";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { faSave, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";

  let { data = $bindable() } = $props();

  let mnemonic = $state(data.storage.mnemonic);
  let confirmModal: HTMLDialogElement | undefined = $state();

  async function onSubmit(event: Event) {
    event.preventDefault();
    await data.storage.saveConfig(data.config);
    await invalidateAll();
  }

  function showConfirmModal() {
    confirmModal?.showModal();
  }

  function closeConfirmModal() {
    confirmModal?.close();
  }

  async function onDeleteUserData() {
    await data.storage.resetData();
    const directory = await navigator.storage.getDirectory();
    // @ts-expect-error not yet in the types
    for await (const [name, entry] of directory.entries()) {
      await directory.removeEntry(name, { recursive: true });
    }

    window.localStorage.clear();
    await invalidateAll();
    await goto("/");
  }
</script>

<dialog bind:this={confirmModal} class="modal">
  <div class="modal-box">
    <h3 class="mb-2 text-lg font-bold">Confirmation</h3>
    <p>Are you sure you want to delete all your local data? This can not be undone.</p>
    <div class="modal-action">
      <button onclick={closeConfirmModal} class="btn btn-secondary">
        <Fa icon={faXmark} /> Cancel
      </button>
      <button onclick={onDeleteUserData} class="btn btn-error">
        <Fa icon={faTrash} /> Yes, delete all data
      </button>
    </div>
  </div>

  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>

<TopMenu modelName={data.activeModel}>
  {#snippet breadcrumbs()}
    <ul>
      <li><a href="/">Home</a></li>
      <li>Settings</li>
    </ul>
  {/snippet}
</TopMenu>

<main class="w-full max-w-3xl self-center">
  <h1 class="mb-4 text-4xl font-black">Settings</h1>
  <form class="flex flex-col" onsubmit={onSubmit}>
    <section class="mb-8">
      <div class="form-control">
        <label class="label" for="user-name">
          <span class="label-text">Name of user character</span>
        </label>
        <input
          id="user-name"
          type="text"
          class="input input-primary"
          placeholder="User"
          bind:value={data.config.userName}
        />
      </div>
      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text"> Notifications for new messages </span>
          <input
            type="checkbox"
            class="checkbox"
            bind:checked={data.config.notifications.newMessage}
          />
        </label>
      </div>
      <div class="form-control">
        <label class="label" for="temperature">
          <span class="label-text">Temperature</span>
        </label>
        <input
          id="temperature"
          type="number"
          class="input input-primary"
          min="0"
          max="2"
          step="0.1"
          bind:value={data.config.llm.temperature}
        />
        <div class="label">
          <span class="label-text-alt">
            Controls how "spicy" the generated answers are. Lower values are more conservative,
            higher values are more creative, values between 0 and 2.
          </span>
        </div>
      </div>
      <div class="form-control">
        <label class="label" for="temperature">
          <span class="label-text">Answer length</span>
        </label>
        <input
          id="temperature"
          type="number"
          class="input input-primary"
          min="1"
          max="2048"
          bind:value={data.config.llm.maxTokens}
        />
        <div class="label">
          <span class="label-text-alt">
            Maximum number of tokens in the generated answer. The default is 250, the maximum is
            2048.
          </span>
        </div>
      </div>
    </section>

    <section class="mb-8">
      <h2 class="text-2xl font-bold">Sync settings</h2>

      <div class="form-control">
        <label for="mnemonic" class="label">
          <span class="label-text">Mnemonic</span>
        </label>

        <input
          id="mnemonic"
          type="text"
          bind:value={mnemonic}
          class="input input-primary"
          disabled
        />
      </div>
    </section>

    <section>
      <h2 class="text-2xl font-bold">Text-to-speech</h2>
      <p class="mb-2">
        You can use <ExternalLink href="https://github.com/daswer123/xtts-api-server"
          >xtts-api-server</ExternalLink
        > for text-to-speech. Setting it up is a bit involved at the moment (see their README).
      </p>

      <div class="form-control">
        <label class="label cursor-pointer">
          <span class="label-text">Enabled</span>

          <input type="checkbox" class="checkbox" bind:checked={data.config.tts.enabled} />
        </label>
      </div>

      <div class="form-control">
        <label for="ttsServerUrl" class="label">
          <span class="label-text"> Server URL </span>
        </label>

        <input
          id="ttsServerUrl"
          type="url"
          bind:value={data.config.tts.apiUrl}
          class="input input-primary"
          placeholder="http://localhost:8020"
        />
      </div>
    </section>

    <button type="submit" class="btn btn-primary mt-4 self-end">
      <Fa icon={faSave} />
      Save</button
    >
  </form>

  <section class="my-8 flex w-full flex-col rounded-xl border-4 border-error p-4">
    <h2 class="text-2xl font-bold text-error">Danger Zone</h2>
    <p>The actions in this section are irreversible, so be careful!</p>

    <div class="flex items-baseline justify-between">
      <span> Deletes all your local data. </span>

      <button type="button" class="btn btn-error mt-4" onclick={showConfirmModal}>
        <Fa icon={faTrash} />
        Reset User Data
      </button>
    </div>
  </section>
</main>
