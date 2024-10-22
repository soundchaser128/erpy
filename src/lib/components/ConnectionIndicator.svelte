<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { faCircle } from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";

  export let modelName: string | undefined;
</script>

<div class="flex items-center gap-2 py-2 text-sm">
  {#if !modelName}
    <span>No model selected.</span>
  {/if}

  <Fa icon={faCircle} class={modelName ? "text-success" : "text-error"} />
</div>
