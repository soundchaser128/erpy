<script>
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { faArrowUpRightFromSquare, faBrain } from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";

  let { data } = $props();

  const openAiEnabled = data.backends.includes("open-ai");
  const mistralEnabled = data.backends.includes("mistral");
</script>

<TopMenu modelName={data.activeModel}>
  {#snippet breadcrumbs()}
    <ul>
      <li>
        <a href="/">Home</a>
      </li>
      <li>Models</li>
    </ul>
  {/snippet}
</TopMenu>

<main class="flex w-full max-w-3xl flex-col self-center">
  <div class="prose mb-4">
    <h1>Models</h1>

    <p>
      You can connect to an external API to chat (any OpenAI-compatible API should work) or run
      models directly with erpy.
    </p>
  </div>
  <div class="flex gap-4 self-center">
    <a
      class="btn btn-primary btn-lg {!mistralEnabled ? 'btn-disabled' : ''}"
      href="/models/mistral"
    >
      <Fa icon={faBrain} />
      Run with erpy</a
    >
    <a class="btn btn-primary btn-lg {!openAiEnabled ? 'btn-disabled' : ''}" href="/models/openai">
      <Fa icon={faArrowUpRightFromSquare} />
      Connect to API</a
    >
  </div>
</main>
