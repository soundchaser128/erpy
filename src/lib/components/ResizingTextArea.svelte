<script lang="ts">
  import autosize from "autosize";
  import { onMount } from "svelte";

  let { value = $bindable(), ...rest } = $props();
  let textarea: HTMLTextAreaElement | undefined = $state();

  onMount(() => {
    if (textarea) {
      autosize(textarea);
    }
  });
</script>

<textarea bind:this={textarea} {...rest}></textarea>
