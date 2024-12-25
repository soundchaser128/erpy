<script lang="ts">
  let { href, children } = $props();
</script>

<a {href} class="link link-primary" target="_blank" rel="noopener">
  {@render children?.()}
</a>
