<script lang="ts">
  interface Props {
    children?: import("svelte").Snippet;
  }

  let { children }: Props = $props();
</script>

<main class="container mx-auto flex flex-col pt-4">
  <div class="flex w-full max-w-2xl flex-col self-center">
    {@render children?.()}
  </div>
</main>
