<script lang="ts">
  import TopMenu from "$lib/components/TopMenu.svelte";
  import type { PageData } from "./$types";

  export let data: PageData;
</script>

<TopMenu modelName={data.activeModel}>
  <svelte:fragment slot="breadcrumbs">
    <ul>
      <li><a href="/">Home</a></li>
      <li>Archive</li>
    </ul>
  </svelte:fragment>
  <svelte:fragment slot="right"></svelte:fragment>
</TopMenu>
