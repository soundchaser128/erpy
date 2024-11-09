<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { faSave } from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";

  export let data;

  const onSubmit = async () => {
    await data.storage.saveConfig(data.config);
    await invalidateAll();
  };
</script>

<TopMenu modelName={data.activeModel}>
  <svelte:fragment slot="breadcrumbs">
    <ul>
      <li><a href="/">Home</a></li>
      <li>Settings</li>
    </ul>
  </svelte:fragment>
  <svelte:fragment slot="right"></svelte:fragment>
</TopMenu>

<main class="w-full max-w-3xl self-center">
  <h1 class="mb-4 text-4xl font-black">Settings</h1>
  <form class="flex flex-col" on:submit|preventDefault={onSubmit}>
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
          Controls how "spicy" the generated answers are. Lower values are more conservative, higher
          values are more creative, values between 0 and 2.
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
          Maximum number of tokens in the generated answer. The default is 250, the maximum is 2048.
        </span>
      </div>
    </div>

    <h2 class="text-2xl font-bold">Sync settings</h2>
    <div class="form-control">
      <label for="syncServerUrl" class="label">
        <span class="label-text"> Server URL </span>
      </label>

      <input
        id="syncServerUrl"
        type="url"
        bind:value={data.config.sync.serverUrl}
        class="input input-primary"
        placeholder="http://localhost:4041"
      />
    </div>

    <div class="form-control">
      <label for="syncClientId" class="label">
        <span class="label-text">Client ID</span>
      </label>

      <input
        id="syncClientId"
        type="text"
        bind:value={data.config.sync.clientId}
        class="input input-primary"
        placeholder="A unique identifier for this machine."
      />
    </div>
    <div class="form-control">
      <label for="syncApiKey" class="label">
        <span class="label-text">API key</span>
      </label>

      <input
        id="syncApiKey"
        type="text"
        bind:value={data.config.sync.apiKey}
        class="input input-primary"
        placeholder="The API key configured on the server"
      />
    </div>

    <button type="submit" class="btn btn-primary mt-4 self-end">
      <Fa icon={faSave} />
      Save</button
    >
  </form>
</main>
