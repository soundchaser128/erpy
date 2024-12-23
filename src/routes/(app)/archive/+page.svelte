<script lang="ts">
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { formatTimestamp } from "$lib/helpers";
  import Fa from "svelte-fa";
  import { faCaretRight, faRotateLeft } from "@fortawesome/free-solid-svg-icons";
  import { invalidateAll } from "$app/navigation";
  import type { Chat } from "$lib/storage";

  let { data } = $props();

  function findCharacterName(chat: Chat): string {
    return data.characters.find((c) => c.id === chat.characterId)?.name || "Unknown";
  }

  async function restoreChat(chat: Chat) {
    data.storage.setChatArchived(chat.id, false);
    await invalidateAll();
  }
</script>

<TopMenu modelName={data.activeModel}>
  {#snippet breadcrumbs()}
    <ul>
      <li><a href="/">Home</a></li>
      <li>Archive</li>
    </ul>
  {/snippet}
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
          <td>{formatTimestamp(chat.history[0].content[0].timestamp, "short")}</td>
          <td
            >{formatTimestamp(
              chat.history[chat.history.length - 1].content[0].timestamp,
              "short",
            )}</td
          >
          <td>
            <div class="flex items-center gap-1">
              <button onclick={() => restoreChat(chat)} class="btn btn-secondary btn-sm">
                <Fa icon={faRotateLeft} />
                Restore</button
              >
              <a
                href="/character/{chat.characterId}/chat/{chat.id}?readOnly=true"
                class="btn btn-primary btn-sm"
              >
                Read <Fa icon={faCaretRight} /></a
              >
            </div>
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
