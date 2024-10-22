<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { goto } from "$app/navigation";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import type { LoadModel } from "$lib/types.js";

  export let data;

  let loading = false;
  let modelId = "";
  let fileName = "";
  let chatTemplate = "";

  async function onSubmit() {
    loading = true;

    modelId = modelId.trim();
    fileName = fileName.trim();
    const templatePath = "chat_templates/" + chatTemplate.trim();
    const payload = {
      type: "mistral",
      modelId,
      fileName,
      chatTemplate: templatePath,
    } satisfies LoadModel;

    await invoke("load_model", { payload });
    loading = false;
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
      <li>Load model</li>
    </ul>
  </svelte:fragment>
  <svelte:fragment slot="right"></svelte:fragment>
</TopMenu>

<main class="container mx-auto">
  <h1 class="mb-4 text-4xl font-black">Load model</h1>
  {#if data.activeModel}
    <p>Current model: <code>{data.activeModel}</code></p>
  {/if}

  <form class="flex w-full flex-col gap-4" on:submit|preventDefault={onSubmit}>
    <div class="form-control">
      <label class="label" for="modelId"><span class="label-text">Model ID</span></label>
      <input
        type="text"
        class="input input-primary"
        bind:value={modelId}
        id="modelId"
        placeholder="Enter a model ID like 'TheDrummer/Rocinante-12B-v1.1-GGUF'..."
      />
    </div>

    <div class="form-control">
      <label class="label" for="fileName"><span class="label-text">Model ID</span></label>
      <input
        type="text"
        class="input input-primary"
        bind:value={fileName}
        id="fileName"
        placeholder="Enter a specific file for that model, like 'Rocinante-12B-v1.1-Q5_K_M.gguf'..."
      />
    </div>

    <div class="form-control">
      <label class="label" for="chatTemplate"><span class="label-text">Chat Template</span></label>
      <select class="select select-primary" bind:value={chatTemplate} id="chatTemplate">
        <option value="chatml.json">chatml.json</option>
        <option value="default.json">default.json</option>
        <option value="llama2.json">llama2.json</option>
        <option value="llama3.json">llama3.json</option>
        <option value="mistral.json">mistral.json</option>
        <option value="phi3.5.json">phi3.5.json</option>
        <option value="phi3.json">phi3.json</option>
        <option value="vicuna.json">vicuna.json</option>
      </select>
    </div>

    <button
      type="submit"
      class="btn btn-primary self-end"
      disabled={loading || !modelId || !fileName || !chatTemplate}
    >
      {loading ? "Loading..." : "Load Model"}
    </button>
  </form>
</main>
