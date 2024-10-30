<script lang="ts">
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { setChatArchived, type Chat } from "$lib/database";
  import { formatTimestamp } from "$lib/helpers";
  import Fa from "svelte-fa";
  import type { PageData } from "./$types";
  import { faCaretRight, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
  import { invalidateAll } from "$app/navigation";

  export let data: PageData;

  function findCharacterName(chat: Chat): string {
    return data.characters.find((c) => c.id === chat.characterId)?.payload.name || "Unknown";
  }

  async function restoreChat(chat: Chat) {
    await setChatArchived(chat.id, false);
    await invalidateAll();
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
          <td><strong>{findCharacterName(chat)}</strong></td>
          <td>{chat.title || "<No title>"}</td>
          <td>{formatTimestamp(chat.data[0].content[0].timestamp)}</td>
          <td>{formatTimestamp(chat.data[chat.data.length - 1].content[0].timestamp)}</td>
          <td>
            <button on:click={() => restoreChat(chat)} class="btn btn-secondary btn-sm">
              <Fa icon={faRotateLeft} />
              Restore</button
            >
            <a
              href="/character/{chat.characterId}/chat/{chat.id}?tabs=false"
              class="btn btn-primary btn-sm"
            >
              <Fa icon={faCaretRight} /></a
            >
          </td>
        </tr>
      {:else}
        <tr>
          <td class="text-center font-light" colspan="6">No chats archived yet.</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
