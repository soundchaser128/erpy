<script>
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { faArrowUpRightFromSquare, faBrain } from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";
  export let data;
</script>

<TopMenu modelName={data.activeModel}>
  <svelte:fragment slot="breadcrumbs">
    <ul>
      <li>
        <a href="/">Home</a>
      </li>
      <li>Models</li>
    </ul>
  </svelte:fragment>
  <svelte:fragment slot="right"></svelte:fragment>
</TopMenu>

<div class="prose mb-4">
  <h1>Models</h1>

  <p>
    You can connect to an external API to chat (any OpenAI-compatible API should work) or run models
    directly with erpy.
  </p>
</div>
<div class="flex gap-4 self-center">
  <a class="btn btn-primary btn-lg" href="/models/mistral">
    <Fa icon={faBrain} />
    Run with erpy</a
  >
  <a class="btn btn-primary btn-lg" href="/models/openai">
    <Fa icon={faArrowUpRightFromSquare} />
    Connect to API</a
  >
</div>
