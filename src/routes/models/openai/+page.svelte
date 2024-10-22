<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import type { ConnectionTestResult, LoadModel } from "$lib/types";
  import { faSave, faFlask } from "@fortawesome/free-solid-svg-icons";
  import { invoke } from "@tauri-apps/api/core";
  import Fa from "svelte-fa";

  export let data;

  let apiUrl = "";
  let apiKey = "";
  let connectionTestStatus: "success" | string | undefined = undefined;
  let testingConnection = false;

  async function testConnection() {
    testingConnection = true;
    const result = await invoke<ConnectionTestResult>("test_connection", {
      apiUrl,
      apiKey: apiKey.trim() || undefined,
    });

    if (result.type === "success") {
      connectionTestStatus = "success";
    } else {
      connectionTestStatus = result.error;
    }
    testingConnection = false;
  }

  async function onSubmit() {
    const payload = {
      type: "open-ai",
      apiUrl,
      apiKey: apiKey.trim() || undefined,
    } satisfies LoadModel;

    await invoke("load_model", { payload });
    await invalidateAll();
    goto("/");
  }
</script>

<TopMenu modelName={data.activeModel}>
  <svelte:fragment slot="breadcrumbs">
    <ul>
      <li>
        <a href="/">Home</a>
      </li>
      <li><a href="/models">Models</a></li>
      <li>OpenAI connection</li>
    </ul>
  </svelte:fragment>
  <svelte:fragment slot="right"></svelte:fragment>
</TopMenu>

<main class="container mx-auto">
  <h1 class="mb-4 text-4xl font-black">OpenAI connection</h1>
  {#if connectionTestStatus !== undefined}
    {#if connectionTestStatus === "success"}
      <div class="alert alert-success">Connection test successful!</div>
    {:else}
      <div class="alert alert-error">
        {connectionTestStatus}
      </div>
    {/if}
  {/if}
  <form class="flex flex-col" on:submit|preventDefault={onSubmit}>
    <div class="form-control">
      <label class="label" for="url-field">
        <span class="label-text">URL of the OpenAI-compatible endpoint (required)</span>
      </label>
      <input
        id="url-field"
        type="text"
        class="input input-primary"
        placeholder="http://localhost:1234/v1"
        bind:value={apiUrl}
        required
      />
    </div>

    <div class="form-control">
      <label for="api-key-field" class="label cursor-pointer">
        <span class="label-text">API key (optional)</span>
      </label>
      <input id="api-key=field" type="text" class="input input-primary" bind:value={apiKey} />
    </div>

    <div class="mt-4 flex gap-2 self-end">
      <button
        disabled={testingConnection || !apiUrl}
        on:click={testConnection}
        type="button"
        class="btn btn-secondary"
      >
        <Fa icon={faFlask} />
        Test connection
      </button>
      <button disabled={!apiUrl} type="submit" class="btn btn-primary">
        <Fa icon={faSave} />
        Save</button
      >
    </div>
  </form>
</main>
