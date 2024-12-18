<script lang="ts">
  import Fa from "svelte-fa";
  import ConnectionIndicator from "./ConnectionIndicator.svelte";
  import { faCog, faFolder } from "@fortawesome/free-solid-svg-icons";

  export let modelName: string | undefined;
</script>

<section class="-mx-4 mb-4 flex justify-between bg-base-200 px-4 py-2">
  <div class="breadcrumbs text-sm">
    <slot name="breadcrumbs"></slot>
  </div>
  <div class="flex items-center gap-2">
    <ConnectionIndicator {modelName} />

    <slot name="right"></slot>
    <a class="btn btn-ghost btn-sm" href="/models">
      <Fa icon={faFolder} class="inline-block" />
      Models
    </a>
    <a class="btn btn-ghost btn-sm" href="/settings">
      <Fa icon={faCog} class="inline-block" />
      Settings</a
    >
  </div>
</section>
