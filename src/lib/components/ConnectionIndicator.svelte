<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { faCircle, faEject } from "@fortawesome/free-solid-svg-icons";
  import { invoke } from "@tauri-apps/api/core";
  import Fa from "svelte-fa";

  interface Props {
    modelName: string | undefined;
  }

  let { modelName }: Props = $props();

  async function onUnload() {
    await invoke("unload_model");
    await invalidateAll();
  }
</script>

<div class="flex items-center gap-2 text-sm">
  {#if !modelName}
    <span>No model selected.</span>
  {:else}
    <button class="btn btn-primary btn-sm" onclick={onUnload}>
      <Fa icon={faEject} />
      Unload
    </button>
  {/if}

  <Fa icon={faCircle} class={modelName ? "text-success" : "text-error"} />
</div>
