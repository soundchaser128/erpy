<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { log } from "$lib/log.js";
  import type { ConnectionTestResult, LoadModel } from "$lib/types";
  import { faSave, faFlask, faCheck } from "@fortawesome/free-solid-svg-icons";
  import { invoke } from "@tauri-apps/api/core";
  import Fa from "svelte-fa";

  let { data } = $props();

  let apiUrl = $state(localStorage.getItem("openai-api-url") || "");
  let apiKey = $state(localStorage.getItem("openai-api-key") || "");
  let model = $state(localStorage.getItem("openai-model") || "");
  let connectionTestStatus: "success" | string | undefined = $state(undefined);
  let testingConnection = $state(false);
  let models: string[] = $state([]);

  async function testConnection() {
    testingConnection = true;
    const result = await invoke<ConnectionTestResult>("test_connection", {
      apiUrl,
      apiKey: apiKey.trim() || undefined,
    });

    if (result.type === "success") {
      connectionTestStatus = "success";
      models = result.models;
      log("available models", models);
    } else {
      connectionTestStatus = result.error;
    }
    testingConnection = false;
  }

  async function onSubmit(event: Event) {
    event.preventDefault();

    const payload = {
      type: "open-ai",
      apiUrl,
      apiKey: apiKey.trim() || undefined,
      model,
    } satisfies LoadModel;

    await invoke("load_model", { payload });
    await invalidateAll();
    localStorage.setItem("openai-api-url", apiUrl);
    localStorage.setItem("openai-api-key", apiKey);
    localStorage.setItem("openai-model", model);
    goto("/");
  }
</script>

<TopMenu modelName={data.activeModel}>
  {#snippet breadcrumbs()}
    <ul>
      <li>
        <a href="/">Home</a>
      </li>
      <li><a href="/models">Models</a></li>
      <li>OpenAI connection</li>
    </ul>
  {/snippet}
</TopMenu>

<main class="w-full max-w-3xl self-center">
  <h1 class="mb-4 text-4xl font-black">OpenAI connection</h1>
  {#if connectionTestStatus !== undefined}
    {#if connectionTestStatus === "success"}
      <div class="alert alert-success">
        <Fa icon={faCheck} />
        Connection test successful!
      </div>
    {:else}
      <div class="alert alert-error">
        {connectionTestStatus}
      </div>
    {/if}
  {/if}
  <form class="flex flex-col" onsubmit={onSubmit}>
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
      <input
        id="api-key=field"
        type="text"
        class="input input-primary"
        bind:value={apiKey}
        placeholder="Enter your API key"
      />
      <div class="label">
        <span class="label-text-alt">
          If you're running your model locally (e.g. with LM Studio or KoboldCpp), you won't need
          this. If you're connecting to some external API (e.g. the official OpenAI API) you'll need
          to add your API key here.
        </span>
      </div>
    </div>

    <div class="form-control">
      <label for="model-field" class="label cursor-pointer">
        <span class="label-text">Model</span>
      </label>
      <input
        id="model-field"
        type="text"
        class="input input-primary"
        bind:value={model}
        required
        placeholder="Enter the model name"
      />
    </div>

    <div class="mt-4 flex gap-2 self-end">
      <button
        disabled={testingConnection || !apiUrl}
        onclick={testConnection}
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
