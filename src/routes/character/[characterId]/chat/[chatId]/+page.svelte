<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { listen, once, emit } from "@tauri-apps/api/event";
  import { toApiRequest, type CompletionResponse } from "$lib/types";
  import {
    type ChatHistoryItem,
    deleteChat,
    saveChatHistory,
    setChatArchived,
    updateChatTitle,
  } from "$lib/database";
  import SvelteMarkdown from "svelte-markdown";
  import { onMount } from "svelte";
  import Fa from "svelte-fa";
  import {
    faEnvelope,
    faCaretLeft,
    faCaretRight,
    faTrash,
    faXmark,
    faPenToSquare,
    faSave,
    faRotateRight,
    faCodeFork,
    faBars,
    faArchive,
  } from "@fortawesome/free-solid-svg-icons";
  import { clamp, formatTimestamp, getAvatar, getInitialChatHistory, truncate } from "$lib/helpers";
  import { createNotification } from "$lib/notifications";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import invariant from "tiny-invariant";
  import { page } from "$app/stores";

  export let data;

  let question = "";
  let status = "idle";
  let editText = "";
  let summarizing = false;
  let newTitle = "";

  let messageContainer: HTMLElement;
  let deleteModal: HTMLDialogElement;
  let titleModal: HTMLDialogElement;
  let messageToEdit: ChatHistoryItem | null = null;
  let hideTabs = $page.url.searchParams.get("tabs") === "false";

  $: rowCount = Math.max(1, question.split("\n").length);
  $: chatHistory = data.history.data;
  $: tokenCount = estimateTokens(chatHistory);
  $: historyId = data.history.id === -1 ? null : data.history.id;

  export const snapshot = {
    capture: () => question,
    restore: (value) => (question = value),
  };

  function scrollToBottom(type: "smooth" | "instant" = "smooth") {
    messageContainer.scrollTo({ top: messageContainer.scrollHeight, behavior: type });
  }

  onMount(() => {
    scrollToBottom("instant");
  });

  async function onAddNewSwipe() {
    await onSubmit(true);
  }

  async function onSubmit(addToExisting = false) {
    if (!data.activeModel) {
      return;
    }

    if (status === "idle") {
      status = "loading";
      const timestamp = Date.now();
      invariant(!!data.activeModel, "No active model selected");

      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.role !== "user" && !addToExisting) {
        if (question.trim().length > 0) {
          const q: ChatHistoryItem = {
            role: "user",
            content: [
              {
                content: question.trim(),
                timestamp,
                modelId: data.activeModel,
              },
            ],
            chosenAnswer: 0,
          };
          chatHistory = [...chatHistory, q];
        }
        question = "";
      }

      const answer: ChatHistoryItem = addToExisting
        ? lastMessage
        : {
            role: "assistant",
            content: [{ content: "", timestamp, modelId: data.activeModel }],
            chosenAnswer: 0,
          };

      if (!addToExisting) {
        chatHistory = [...chatHistory, answer];
      } else {
        answer.content.push({
          content: "",
          timestamp,
          modelId: data.activeModel,
        });
        answer.chosenAnswer += 1;
        chatHistory = [...chatHistory];
      }

      const history = addToExisting ? chatHistory.slice(0, -1) : chatHistory;
      invoke("chat_completion", {
        messageHistory: toApiRequest(history),
        config: data.config,
      });

      scrollToBottom();
      const unlisten = await listen<CompletionResponse>("completion", (response) => {
        answer.content[answer.chosenAnswer].content += response.payload.choices[0].delta.content;
        chatHistory = [...chatHistory];
        scrollToBottom();
      });
      once("completion_done", async () => {
        await saveChatHistory(historyId, data.character.id, chatHistory);
        unlisten();
        status = "idle";

        if (data.config.notifications.newMessage) {
          const messageContent = answer.content[answer.chosenAnswer].content;
          await createNotification("erpy", messageContent, false);
        }
      });
    } else if (status === "loading") {
      await emit("cancel");
      status = "idle";
    }
  }

  async function createNewChat() {
    invariant(!!data.activeModel, "No active model selected");
    const newChatId = await saveChatHistory(
      null,
      data.character.id,
      getInitialChatHistory(data.character, data.config.userName, data.activeModel),
    );

    goto(`/character/${data.character.id}/chat/${newChatId}`);
  }

  function getContent(entry: ChatHistoryItem): string {
    const selectedAnswer = entry.content[entry.chosenAnswer];
    return selectedAnswer.content;
  }

  function getTimestamp(entry: ChatHistoryItem): string {
    const selectedAnswer = entry.content[entry.chosenAnswer];
    return formatTimestamp(selectedAnswer.timestamp);
  }

  async function changeSelectedAnswer(entry: ChatHistoryItem, delta: number) {
    entry.chosenAnswer = clamp(entry.chosenAnswer + delta, 0, entry.content.length - 1);
    chatHistory = [...chatHistory];
    await saveChatHistory(historyId, data.character.id, chatHistory);
  }

  async function deleteMessage(entry: ChatHistoryItem) {
    if (entry.content.length > 1) {
      entry.content.splice(entry.chosenAnswer, 1);
      entry.chosenAnswer = entry.content.length - 1;
      chatHistory = [...chatHistory];
    } else {
      chatHistory = chatHistory.filter((item) => item !== entry);
    }

    await saveChatHistory(historyId, data.character.id, chatHistory);
  }

  function isFirstAssistantMessage(index: number): boolean {
    const firstAssistantMessage = chatHistory.findIndex((item) => item.role === "assistant");
    return firstAssistantMessage === index;
  }

  function onStartEdit(entry: ChatHistoryItem) {
    scrollToBottom();
    editText = entry.content[entry.chosenAnswer].content;
    messageToEdit = entry;
  }

  async function onForkChat(entry: ChatHistoryItem) {
    const forkedHistory = chatHistory.slice(0, chatHistory.indexOf(entry) + 1);
    const newChatId = await saveChatHistory(null, data.character.id, forkedHistory);
    goto(`/character/${data.character.id}/chat/${newChatId}`);
  }

  function onCancelEdit() {
    messageToEdit = null;
  }

  async function onSubmitEdit(event: Event) {
    event.preventDefault();
    if (messageToEdit) {
      messageToEdit.content[messageToEdit.chosenAnswer].content = editText;
      chatHistory = [...chatHistory];
      await saveChatHistory(historyId, data.character.id, chatHistory);
      messageToEdit = null;
    }
  }

  async function summarize() {
    summarizing = true;
    const summarizePrompt =
      "Give me a summary of the following conversation between a user and a chat bot in less than ten words. Reply only with the sumamry and nothing else.";
    const response = await invoke<string>("summarize", {
      chat: data.history,
      config: data.config,
      prompt: summarizePrompt,
    });
    newTitle = response;
    summarizing = false;
  }

  async function onDeleteChat() {
    const chatCount = data.allChats.length - 1;

    await deleteChat(data.history.id);
    closeDeleteModal();
    await invalidateAll();

    if (chatCount === 0) {
      goto("/");
    } else {
      const chatId = data.allChats[0].id;
      goto(`/character/${data.character.id}/chat/${chatId}`);
    }
  }

  function showTitleModal() {
    titleModal.showModal();
  }

  function closeTitleModal() {
    titleModal.close();
  }

  async function onChangeTitle() {
    await updateChatTitle(data.history.id, newTitle);
    await invalidateAll();
    closeTitleModal();
  }

  function showDeleteModal() {
    deleteModal.showModal();
  }

  function closeDeleteModal() {
    deleteModal.close();
  }

  function estimateTokens(chat: ChatHistoryItem[]): number {
    const totalLength = chat.reduce(
      (acc, item) => acc + item.content[item.chosenAnswer].content.length,
      0,
    );
    return Math.ceil(totalLength / 4);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      question += "\n";
    } else if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      onSubmit(true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSubmit();
    } else if (e.key === "ArrowUp" && rowCount === 1) {
      e.preventDefault();
      onStartEdit(chatHistory[chatHistory.length - 1]);
    }
  }

  async function archiveChat() {
    await setChatArchived(data.history.id, true);
    await invalidateAll();
  }
</script>

<dialog bind:this={deleteModal} class="modal">
  <div class="modal-box">
    <h3 class="mb-2 text-lg font-bold">Confirmation</h3>
    <p>Are you sure you want to delete this chat?</p>
    <div class="modal-action">
      <button on:click={closeDeleteModal} class="btn btn-secondary">
        <Fa icon={faXmark} /> Cancel
      </button>
      <button on:click={onDeleteChat} class="btn btn-error">
        <Fa icon={faTrash} /> Delete
      </button>
    </div>
  </div>

  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>

<dialog bind:this={titleModal} class="modal">
  <div class="modal-box">
    <h3 class="mb-2 text-lg font-bold">Set title</h3>
    <form on:submit|preventDefault={onChangeTitle}>
      <input
        type="text"
        bind:value={newTitle}
        class="input input-primary w-full"
        placeholder="Enter a title for this chat"
      />
      <div class="modal-action">
        <button on:click={closeTitleModal} type="button" class="btn">
          <Fa icon={faXmark} /> Cancel
        </button>
        <button type="button" on:click={summarize} class="btn btn-secondary">
          <Fa icon={faPenToSquare} /> Generate summary
        </button>
        <button type="submit" class="btn btn-success">
          <Fa icon={faSave} /> Save
        </button>
      </div>
    </form>
  </div>

  <form method="dialog" class="modal-backdrop">
    <button>close</button>
  </form>
</dialog>

<div class="flex h-screen flex-col">
  <TopMenu modelName={data.activeModel}>
    <svelte:fragment slot="breadcrumbs">
      <ul>
        <li><a href="/">Home</a></li>
        <li>Chat with {data.character.data.name}</li>
      </ul>
    </svelte:fragment>
    <svelte:fragment slot="right">
      <p class="hidden text-sm lg:block">
        Estimated token count: {tokenCount}
      </p>
      <button disabled={!data.activeModel} on:click={createNewChat} class="btn btn-success btn-sm">
        <Fa icon={faEnvelope} />
        New chat
      </button>
      <details class="dropdown dropdown-end">
        <summary class="btn btn-sm">
          <Fa icon={faBars} />
        </summary>
        <ul
          class="menu dropdown-content z-[1] flex w-52 flex-col gap-2 rounded-box bg-base-200 p-2 shadow"
        >
          <li>
            <button on:click={showTitleModal} class="btn btn-secondary btn-sm">
              <Fa icon={faPenToSquare} />
              Set title
            </button>
          </li>
          <li>
            <button on:click={archiveChat} class="btn btn-secondary btn-sm">
              <Fa icon={faArchive} />
              Archive chat
            </button>
          </li>
          <li>
            <button on:click={showDeleteModal} class="btn btn-error btn-sm">
              <Fa icon={faTrash} />
              Delete chat
            </button>
          </li>
        </ul>
      </details>
    </svelte:fragment>
  </TopMenu>

  {#if data.allChats.length > 1 && !hideTabs}
    <div role="tablist" class="tabs tabs-bordered">
      {#each data.allChats as chat}
        <a
          href={`/character/${data.character.id}/chat/${chat.id}`}
          class="tab {chat.id === data.history.id ? 'tab-active' : ''}"
        >
          {truncate(chat.title, 40) ||
            formatTimestamp(chat.data[chat.data.length - 1].content[0].timestamp)}
        </a>
      {/each}
    </div>
  {/if}

  <section bind:this={messageContainer} class="mb-4 h-full w-full grow overflow-x-auto">
    {#each chatHistory as entry, index}
      {#if entry.role !== "system"}
        <div class="chat {entry.role === 'assistant' ? 'chat-start' : 'chat-end'}">
          {#if entry.role === "assistant"}
            <div class="avatar chat-image">
              <div class="w-20 rounded-full shadow-xl">
                <img
                  alt="Avatar image for {data.character.data.name}"
                  src={getAvatar(data.character.data.avatar)}
                />
              </div>
            </div>
          {/if}
          <div class="chat-header flex flex-row items-baseline gap-4 py-2">
            <span>
              {entry.role === "assistant" ? data.character.data.name : data.config.userName}
            </span>

            <span class="join flex items-center">
              {#if entry.content.length > 1}
                <button
                  disabled={entry.chosenAnswer === 0}
                  class="btn join-item btn-sm"
                  on:click={() => changeSelectedAnswer(entry, -1)}
                >
                  <Fa icon={faCaretLeft} />
                </button>
                <button
                  disabled={entry.chosenAnswer === entry.content.length - 1}
                  class="btn join-item btn-sm"
                  on:click={() => changeSelectedAnswer(entry, 1)}
                >
                  <Fa icon={faCaretRight} />
                </button>
                <span class="px-2">
                  {entry.chosenAnswer + 1}/{entry.content.length}
                </span>
              {/if}

              {#if !isFirstAssistantMessage(index)}
                <button on:click={() => deleteMessage(entry)} class="btn join-item btn-sm">
                  <Fa icon={faTrash} />
                </button>

                {#if entry.role === "assistant"}
                  <button on:click={onAddNewSwipe} class="btn join-item btn-sm">
                    <Fa icon={faRotateRight} />
                  </button>
                {/if}
              {/if}
              <button on:click={() => onForkChat(entry)} class="btn join-item btn-sm">
                <Fa icon={faCodeFork} />
              </button>
              <button
                on:click={() => onStartEdit(entry)}
                class="btn join-item btn-sm"
                disabled={entry === messageToEdit}
              >
                <Fa icon={faPenToSquare} />
              </button>
            </span>
          </div>
          <div
            class="chat-bubble shadow-xl lg:max-w-4xl {entry.role === 'user'
              ? 'chat-bubble-secondary'
              : ''} relative"
          >
            {#if messageToEdit === entry}
              <form class="flex w-full grow flex-col" on:submit={onSubmitEdit}>
                <textarea
                  class="w-full whitespace-pre-wrap bg-transparent text-white"
                  bind:value={editText}
                  rows={12}
                  cols={160}
                ></textarea>
                <div class="join mt-2 flex self-end">
                  <button on:click={onCancelEdit} type="button" class="btn join-item btn-sm">
                    <Fa icon={faXmark} /> Cancel
                  </button>
                  <button type="submit" class="btn btn-success join-item btn-sm">
                    <Fa icon={faSave} /> Save
                  </button>
                </div>
              </form>
            {:else if getContent(entry).length > 0}
              <div
                class="prose-invert prose-ol:list-inside prose-ol:list-decimal prose-img:float-left prose-img:m-2 prose-img:max-h-96"
              >
                <SvelteMarkdown options={{ gfm: true, breaks: true }} source={getContent(entry)} />
              </div>
            {:else}
              <span class="flex items-end gap-2"
                >Thinking <span class="loading loading-dots loading-xs"></span></span
              >
            {/if}
          </div>

          <div class="chat-footer opacity-50">
            {getTimestamp(entry)}
          </div>
        </div>
      {/if}
    {/each}
  </section>
  <form on:submit|preventDefault={() => onSubmit()} class="flex shrink items-center gap-2 pb-2">
    <!-- svelte-ignore a11y-autofocus -->
    <textarea
      bind:value={question}
      class="textarea textarea-primary w-full"
      placeholder="Type your message..."
      autofocus
      rows={rowCount}
      on:keydown={handleKeyDown}
    ></textarea>
    <button
      disabled={!data.activeModel}
      class="btn {status === 'loading' ? 'btn-error' : 'btn-success'}"
    >
      {#if status === "loading"}
        <Fa icon={faXmark} /> Cancel
      {:else}
        <Fa icon={faEnvelope} /> Send
      {/if}
    </button>
  </form>
</div>
