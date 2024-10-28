<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { faCircle } from "@fortawesome/free-solid-svg-icons";
  import { invoke } from "@tauri-apps/api/core";
  import Fa from "svelte-fa";

  export let modelName: string | undefined;

  async function onUnload() {
    await invoke("unload_model");
    await invalidateAll();
  }
</script>

<div class="flex items-center gap-2 py-2 text-sm">
  {#if !modelName}
    <span>No model selected.</span>
  {:else}
    <button class="btn btn-primary btn-sm" on:click={onUnload}> Unload </button>
  {/if}

  <Fa icon={faCircle} class={modelName ? "text-success" : "text-error"} />
</div>
