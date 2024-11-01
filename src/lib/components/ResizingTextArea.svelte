<script lang="ts">
  import autosize from "autosize";
  import { onMount } from "svelte";

  let textarea: HTMLTextAreaElement;

  onMount(() => {
    autosize(textarea);
  });
</script>

<textarea bind:this={textarea} {...$$restProps}></textarea>
