<script lang="ts">
  import "../app.css";
  import "@fontsource-variable/outfit";
  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();
</script>

<div class="mx-4 flex flex-col">
  {@render children?.()}
</div>
