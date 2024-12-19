<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { goto, invalidateAll } from "$app/navigation";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import type { LoadModel } from "$lib/types.js";

  export let data;

  let downloading = false;
  let loading = false;

  let modelId = "";
  let fileName = "";
  let chatTemplate = "";
  let modelOnDisk = "";

  async function onSubmit() {
    let payload;
    if (modelId && fileName && modelOnDisk !== "__none__") {
      downloading = true;
      modelId = modelId.trim();
      fileName = fileName.trim();
      const templatePath = "chat_templates/" + chatTemplate.trim();
      payload = {
        type: "mistral",
        modelId,
        fileName,
        chatTemplate: templatePath,
      } satisfies LoadModel;
    } else {
      loading = true;
      const path = modelOnDisk;
      const parent = path.split("/").slice(0, -1).join("/") + "/";
      const fileName = path.split("/").slice(-1)[0];
      // FIXME
      const templatePath = "chat_templates/llama3.json";

      payload = {
        type: "mistral",
        modelId: parent,
        fileName,
        chatTemplate: templatePath,
      } satisfies LoadModel;
    }

    await invoke("load_model", { payload });
    await invalidateAll();
    downloading = false;
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

<main class="w-full max-w-3xl self-center">
  <h1 class="mb-4 text-4xl font-black">Load model</h1>

  {#if data.modelsOnDisk.length > 0}
    <form class="flex w-full flex-col" on:submit|preventDefault={onSubmit}>
      <div class="form-control">
        <label class="label" for="modelDropdown"
          ><span class="label-text">Select an already downloaded model</span></label
        >

        <select bind:value={modelOnDisk} class="select select-primary" id="modelDropdown">
          <option value="__none__" selected disabled>Select a model...</option>
          {#each data.modelsOnDisk as model}
            <option value={model.path}>{model.name}</option>
          {/each}
        </select>
      </div>

      <button
        disabled={modelOnDisk === "__none__" || !modelOnDisk || loading}
        class="btn btn-primary mt-4 self-end">Load Model</button
      >
    </form>

    <div class="divider">OR</div>
  {/if}

  <form class="flex w-full flex-col" on:submit|preventDefault={onSubmit}>
    <p>Download a new model from HuggingFace</p>
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
      class="btn btn-primary mt-4 self-end"
      disabled={downloading || !modelId || !fileName || !chatTemplate}
    >
      {downloading ? "Downloading..." : "Download"}
    </button>
  </form>
</main>
