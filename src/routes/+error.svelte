<script lang="ts">
  import { page } from "$app/stores";
</script>

<main class="prose self-center">
  <p><strong>{$page.status}:</strong> {$page.error?.message}</p>
</main>
