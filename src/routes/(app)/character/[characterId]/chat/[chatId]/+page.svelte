<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { listen, once, emit } from "@tauri-apps/api/event";
  import { toApiRequest, type CompletionResponse } from "$lib/types";
  import { MessageRole, type ChatHistoryItem } from "$lib/storage";
  import Markdown from "svelte-exmarkdown";
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
    faVolumeHigh,
    faStop,
  } from "@fortawesome/free-solid-svg-icons";
  import {
    clamp,
    formatNumber,
    getChatTitle,
    getInitialChatHistory,
    toDateTime,
  } from "$lib/helpers";
  import { createNotification } from "$lib/notifications";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { goto, invalidateAll } from "$app/navigation";
  import invariant from "tiny-invariant";
  import { page } from "$app/stores";
  import { gfmPlugin } from "svelte-exmarkdown/gfm";
  import { remarkHighlightQuotes } from "$lib/remark.js";
  import { speak } from "$lib/tts.js";
  import { log } from "$lib/log.js";
  import { DateTime } from "luxon";

  let { data } = $props();

  let chatHistory: ChatHistoryItem[] = $state(data.chat.history);
  let question = $state("");
  let status = $state("idle");
  let editText = $state("");
  let summarizing = $state(false);
  let newTitle = $state("");
  let tokenCount = $derived(estimateTokens(chatHistory));
  let historyId = $derived(data.chat.id);
  let stopSpeaking: (() => void) | undefined = $state(undefined);
  let isSpeaking = $state(false);

  $effect(() => {
    chatHistory = data.chat.history;
  });

  let plugins = [gfmPlugin(), remarkHighlightQuotes()];

  let messageContainer: HTMLElement | undefined = $state();
  let deleteModal: HTMLDialogElement | undefined = $state();
  let titleModal: HTMLDialogElement | undefined = $state();
  let messageToEdit: ChatHistoryItem | null = $state(null);
  let readOnly = $page.url.searchParams.get("readOnly") === "true";
  let ttsOnMessage = $state(false);

  function scrollToBottom(type: "smooth" | "instant" = "smooth") {
    messageContainer!.scrollTo({ top: messageContainer!.scrollHeight, behavior: type });
  }

  onMount(() => {
    scrollToBottom("instant");
  });

  async function onAddNewSwipe() {
    await onSubmit(undefined, true);
  }

  async function onSubmit(event: Event | undefined, addToExisting = false) {
    event?.preventDefault();

    if (!data.activeModel) {
      return;
    }

    if (status === "idle") {
      status = "loading";
      const timestamp = new Date();
      invariant(!!data.activeModel, "No active model selected");

      const lastMessage = chatHistory[chatHistory.length - 1];
      if (lastMessage.role !== MessageRole.User && !addToExisting) {
        if (question.trim().length > 0) {
          const q: ChatHistoryItem = {
            role: MessageRole.User,
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
            role: MessageRole.Assistant,
            content: [{ content: "", timestamp, modelId: data.activeModel }],
            chosenAnswer: 0,
          };

      scrollToBottom();
      if (!addToExisting) {
        chatHistory = [...chatHistory, answer];
      } else {
        answer.content.push({
          content: "",
          timestamp,
          modelId: data.activeModel,
        });
        answer.chosenAnswer += 1;
        // chatHistory.current = [...chatHistory.current];
      }

      scrollToBottom();

      const history = addToExisting ? chatHistory.slice(0, -1) : chatHistory;
      invoke("chat_completion", {
        messageHistory: toApiRequest(history),
        config: data.config,
      });

      const unlisten = await listen<CompletionResponse>("completion", (response) => {
        log("completion", response);
        const delta = response.payload.choices[0].delta.content;
        const answer = chatHistory[chatHistory.length - 1];
        answer.content[answer.chosenAnswer].content += delta;

        scrollToBottom();
      });
      once("completion_done", async () => {
        await data.storage.updateChat(historyId, chatHistory);
        unlisten();
        status = "idle";
        if (ttsOnMessage) {
          await doSpeak(answer);
        }
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
    const newChatId = await data.storage.saveNewChat({
      characterId: data.character.id,
      data: getInitialChatHistory(data.character, data.config.userName, data.activeModel),
    });

    goto(`/character/${data.character.id}/chat/${newChatId}`);
  }

  function getContent(entry: ChatHistoryItem): string {
    const selectedAnswer = entry.content[entry.chosenAnswer];
    return selectedAnswer.content;
  }

  function getTimestamp(entry: ChatHistoryItem): string {
    const selectedAnswer = entry.content[entry.chosenAnswer];
    const date = toDateTime(selectedAnswer.timestamp);
    const today = DateTime.now();

    if (date.hasSame(today, "day")) {
      return date.toLocaleString(DateTime.TIME_24_SIMPLE);
    } else {
      return date.toLocaleString(DateTime.DATETIME_SHORT);
    }
  }

  async function changeSelectedAnswer(entry: ChatHistoryItem, delta: number) {
    entry.chosenAnswer = clamp(entry.chosenAnswer + delta, 0, entry.content.length - 1);
    chatHistory = [...chatHistory];
    await data.storage.updateChat(historyId, chatHistory);
  }

  async function deleteMessage(entry: ChatHistoryItem) {
    if (entry.content.length > 1) {
      entry.content.splice(entry.chosenAnswer, 1);
      entry.chosenAnswer = entry.content.length - 1;
      chatHistory = [...chatHistory];
    } else {
      chatHistory = chatHistory.filter((item) => item !== entry);
    }

    scrollToBottom();

    await data.storage.updateChat(historyId, chatHistory);
  }

  function isFirstAssistantMessage(index: number): boolean {
    const firstAssistantMessage = chatHistory.findIndex((item) => item.role === "assistant");
    return firstAssistantMessage === index;
  }

  function onStartEdit(entry: ChatHistoryItem) {
    // TODO replace by scrolling to the actual element
    // scrollToBottom();
    editText = entry.content[entry.chosenAnswer].content;
    messageToEdit = entry;
  }

  async function onForkChat(entry: ChatHistoryItem) {
    const forkedHistory = chatHistory.slice(0, chatHistory.indexOf(entry) + 1);
    const characterId = data.character?.id;
    invariant(characterId, "character i must be set");

    const newChatId = await data.storage.saveNewChat({
      characterId,
      data: forkedHistory,
    });
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
      await data.storage.updateChat(historyId, chatHistory);
      messageToEdit = null;
    }
  }

  async function summarize() {
    summarizing = true;
    const summarizePrompt =
      "[Pause your roleplay. Generate a title for the content of this chat so far, Limit the summary to 8 words or less. Your response should include nothing but the title.]";

    const response = await invoke<string>("summarize", {
      chat: data.chat,
      prompt: summarizePrompt,
    });
    newTitle = response;
    summarizing = false;
  }

  // FIXME redirect to a better page
  async function onDeleteChat() {
    data.storage.deleteChat(data.chat.id);
    closeDeleteModal();
    await invalidateAll();
    goto("/");
  }

  function showTitleModal() {
    titleModal!.showModal();
  }

  function closeTitleModal() {
    titleModal!.close();
  }

  async function onChangeTitle(event: Event) {
    event.preventDefault();
    await data.storage.updateChatTitle(data.chat.id, newTitle);
    await invalidateAll();
    closeTitleModal();
    newTitle = "";
  }

  function showDeleteModal() {
    deleteModal?.showModal();
  }

  function closeDeleteModal() {
    deleteModal?.close();
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
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      question = question.slice(0, start) + "\n" + question.slice(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
    } else if (e.key === "Enter" && e.ctrlKey) {
      e.preventDefault();
      onSubmit(undefined, true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      onSubmit(undefined);
    } else if (e.key === "ArrowUp" && question.length === 0) {
      e.preventDefault();
      onStartEdit(chatHistory[chatHistory.length - 1]);
    }
  }

  async function archiveChat() {
    await data.storage.setChatArchived(data.chat.id, true);
    await invalidateAll();
  }

  async function doSpeak(entry: ChatHistoryItem) {
    if (data.config.tts.enabled && data.config.tts.apiUrl) {
      const text = getContent(entry);
      isSpeaking = true;
      const { stop, finished } = speak(data.config.tts.apiUrl, text, "tifa", "en");
      stopSpeaking = stop;
      await finished;
      isSpeaking = false;
    }
  }

  async function onSpeakMessage(entry: ChatHistoryItem) {
    if (stopSpeaking) {
      stopSpeaking();
      stopSpeaking = undefined;
      isSpeaking = false;
    } else {
      await doSpeak(entry);
    }
  }
</script>

<dialog bind:this={deleteModal} class="modal">
  <div class="modal-box">
    <h3 class="mb-2 text-lg font-bold">Confirmation</h3>
    <p>Are you sure you want to delete this chat?</p>
    <div class="modal-action">
      <button onclick={closeDeleteModal} class="btn btn-secondary">
        <Fa icon={faXmark} /> Cancel
      </button>
      <button onclick={onDeleteChat} class="btn btn-error">
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
    <form onsubmit={onChangeTitle}>
      <input
        type="text"
        bind:value={newTitle}
        class="input input-primary w-full"
        placeholder="Enter a title for this chat"
        disabled={summarizing}
      />
      <div class="modal-action">
        <button onclick={closeTitleModal} type="button" class="btn">
          <Fa icon={faXmark} /> Cancel
        </button>
        <button type="button" onclick={summarize} class="btn btn-secondary" disabled={summarizing}>
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
    {#snippet breadcrumbs()}
      <ul>
        <li><a href="/">Home</a></li>
        <li>Chat with {data.character.name}</li>
      </ul>
    {/snippet}
    {#snippet right()}
      <p class="hidden text-sm lg:block">
        Estimated token count: {formatNumber(tokenCount)}
      </p>
      <button disabled={readOnly} onclick={createNewChat} class="btn btn-success btn-sm">
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
            <button onclick={showTitleModal} class="btn btn-secondary btn-sm">
              <Fa icon={faPenToSquare} />
              Set title
            </button>
          </li>
          <li>
            <button onclick={archiveChat} class="btn btn-secondary btn-sm">
              <Fa icon={faArchive} />
              Archive chat
            </button>
          </li>
          <li>
            <button onclick={showDeleteModal} class="btn btn-error btn-sm">
              <Fa icon={faTrash} />
              Delete chat
            </button>
          </li>
        </ul>
      </details>
    {/snippet}
  </TopMenu>

  {#if data.allChats.length > 1 && !readOnly}
    <div role="tablist" class="tabs tabs-bordered">
      {#each data.allChats as chat}
        {#if !chat.archived && !chat.isDeleted}
          <a
            href={`/character/${data.character.id}/chat/${chat.id}`}
            class="tab {chat.id === data.chat.id ? 'tab-active' : ''}"
          >
            {getChatTitle(chat)}
          </a>
        {/if}
      {/each}
    </div>
  {/if}

  <section bind:this={messageContainer} class="relative mb-4 h-full w-full grow overflow-x-auto">
    {#each chatHistory as entry, index}
      {#if entry.role !== "system"}
        <div class="chat {entry.role === 'assistant' ? 'chat-start' : 'chat-end'}">
          {#if entry.role === "assistant"}
            <div class="avatar chat-image">
              <div class="w-20 rounded-full shadow-xl">
                <img
                  alt="Avatar image for {data.character.name}"
                  src={data.character.imageBase64}
                />
              </div>
            </div>
          {/if}
          <div class="chat-header flex flex-row items-baseline gap-4 py-2">
            <span>
              {entry.role === "assistant" ? data.character.name : data.config.userName}
            </span>

            {#if !readOnly}
              <span class="join flex items-center">
                {#if entry.content.length > 1}
                  <button
                    disabled={entry.chosenAnswer === 0}
                    class="btn join-item btn-sm"
                    onclick={() => changeSelectedAnswer(entry, -1)}
                  >
                    <Fa icon={faCaretLeft} />
                  </button>
                  <button
                    disabled={entry.chosenAnswer === entry.content.length - 1}
                    class="btn join-item btn-sm"
                    onclick={() => changeSelectedAnswer(entry, 1)}
                  >
                    <Fa icon={faCaretRight} />
                  </button>
                  <span class="px-2">
                    {entry.chosenAnswer + 1}/{entry.content.length}
                  </span>
                {/if}
                <button
                  onclick={() => onStartEdit(entry)}
                  class="btn join-item btn-sm"
                  disabled={entry === messageToEdit}
                >
                  <Fa icon={faPenToSquare} />
                </button>

                {#if entry.role === "assistant" && !isFirstAssistantMessage(index)}
                  <button onclick={onAddNewSwipe} class="btn join-item btn-sm">
                    <Fa icon={faRotateRight} />
                  </button>
                {/if}
                <button onclick={() => onForkChat(entry)} class="btn join-item btn-sm">
                  <Fa icon={faCodeFork} />
                </button>
                {#if data.config.tts.enabled && data.config.experimental.textToSpeech}
                  <button class="btn join-item btn-sm" onclick={() => onSpeakMessage(entry)}>
                    <Fa icon={isSpeaking ? faStop : faVolumeHigh} />
                  </button>
                {/if}

                {#if !isFirstAssistantMessage(index)}
                  <button
                    onclick={() => deleteMessage(entry)}
                    class="btn btn-error join-item btn-sm"
                  >
                    <Fa icon={faTrash} />
                  </button>
                {/if}
              </span>
            {/if}
          </div>
          <div
            class="chat-bubble shadow-xl lg:max-w-4xl {entry.role === 'user'
              ? 'chat-bubble-secondary'
              : ''} relative"
          >
            {#if messageToEdit === entry}
              <form class="flex w-full grow flex-col" onsubmit={onSubmitEdit}>
                <textarea
                  class="w-full whitespace-pre-wrap bg-transparent text-white"
                  bind:value={editText}
                  rows={12}
                  cols={160}
                ></textarea>
                <div class="join mt-2 flex self-end">
                  <button onclick={onCancelEdit} type="button" class="btn join-item btn-sm">
                    <Fa icon={faXmark} /> Cancel
                  </button>
                  <button type="submit" class="btn btn-success join-item btn-sm">
                    <Fa icon={faSave} /> Save
                  </button>
                </div>
              </form>
            {:else if getContent(entry).length > 0}
              <div class="prose prose-invert text-neutral-content">
                <Markdown {plugins} md={getContent(entry)} />
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
  {#if !readOnly}
    <form onsubmit={(e) => onSubmit(e, false)} class="flex shrink items-center gap-2 pb-2">
      <!-- svelte-ignore a11y_autofocus -->
      <textarea
        bind:value={question}
        class="textarea textarea-primary w-full"
        placeholder="Type your message..."
        autofocus
        onkeydown={handleKeyDown}
        rows={1}
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
  {/if}
</div>
