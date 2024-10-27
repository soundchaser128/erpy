<script lang="ts">
  import TopMenu from "$lib/components/TopMenu.svelte";
  import type { Chat } from "$lib/database";
  import { formatTimestamp } from "$lib/helpers";
  import Fa from "svelte-fa";
  import type { PageData } from "./$types";
  import { faCaretRight } from "@fortawesome/free-solid-svg-icons";

  export let data: PageData;

  function findCharacterName(chat: Chat): string {
    return data.characters.find((c) => c.id === chat.characterId)?.data.name || "Unknown";
  }
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

<div class="prose mb-4">
  <h1>Archive</h1>

  <p>Find all your archived chats here.</p>
</div>

<div class="overflow-x-auto">
  <table class="table table-zebra table-sm">
    <thead>
      <tr>
        <th></th>
        <th>Character</th>
        <th>Title</th>
        <th>First message</th>
        <th>Last message</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each data.chats as chat}
        <tr class="hover">
          <td>{chat.id}</td>
          <td>{findCharacterName(chat)}</td>
          <td>{chat.title || "<No title>"}</td>
          <td>{formatTimestamp(chat.data[0].content[0].timestamp)}</td>
          <td>{formatTimestamp(chat.data[chat.data.length - 1].content[0].timestamp)}</td>
          <td>
            <a
              href="/character/{chat.characterId}/chat/{chat.id}?tabs=false"
              class="btn btn-primary btn-sm"
            >
              <Fa icon={faCaretRight} /></a
            >
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
