<script lang="ts">
  import { goto } from "$app/navigation";
  import { setSetupCompleted } from "$lib/service/setup";
  import { storeMnemonic } from "$lib/storage/mnemonic";
  import { createMnemonic } from "@evolu/common";
  import { faCheck, faClipboard } from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";

  let mode: "new" | "existing" | null = $state(null);
  let mnemonic = $state("");
  let generatedMnemonic = createMnemonic();

  function onSubmitExisting() {
    setSetupCompleted();
    storeMnemonic(mnemonic);

    goto("/");
  }

  function generateNew() {
    mode = "existing";
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(generatedMnemonic);
  }

  function onFinished() {
    setSetupCompleted();
    storeMnemonic(generatedMnemonic);

    goto("/");
  }
</script>

<section>
  <h1 class="mb-2 text-4xl font-black">Setup</h1>
  <p>Welcome to erpy! Is this the first time you're using the app?</p>
  <div class="my-4 grid w-full grid-cols-2 gap-2">
    <button onclick={() => (mode = "new")} class="btn btn-primary"> Yes</button>
    <button onclick={generateNew} class="btn btn-secondary">No, I want to enter my mnemonic.</button
    >
  </div>
</section>

{#if mode === "existing"}
  <form onsubmit={onSubmitExisting} class="flex w-full flex-col self-center">
    <p class="mb-2">Enter your mnemonic from another machine:</p>

    <div class="form-control">
      <label class="label" for="mnemonic-input">
        <span class="label-text"> Mnemonic </span>
      </label>

      <input type="text" class="input input-bordered" id="mnemonic-input" bind:value={mnemonic} />

      <button class="btn btn-success">
        <Fa icon={faCheck} /> Continue
      </button>
    </div>
  </form>
{:else if mode === "new"}
  <section class="flex w-full flex-col self-center">
    <p class="mb-2">
      Generated a mnemonic for you. <strong>Make sure to store it somewhere safe</strong> (like a password
      manager). If you lose it, you won't be able to access your data if you uninstall the app.
    </p>

    <div class="flex items-center self-center rounded-lg bg-base-200 p-2 font-mono">
      <span>{generatedMnemonic}</span>
      <button onclick={copyToClipboard} class="btn btn-square btn-ghost btn-sm">
        <Fa icon={faClipboard} />
      </button>
    </div>

    <button onclick={onFinished} class="btn btn-success mt-4 self-end">
      <Fa icon={faCheck} /> Continue
    </button>
  </section>
{/if}
