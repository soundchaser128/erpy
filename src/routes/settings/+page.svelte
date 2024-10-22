<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import TopMenu from "$lib/components/TopMenu.svelte";
  import { saveConfig } from "$lib/database";
  import { faSave } from "@fortawesome/free-solid-svg-icons";
  import Fa from "svelte-fa";

  export let data;

  const onSubmit = async () => {
    await saveConfig(data.config);
    await invalidateAll();
  };
</script>

<TopMenu modelName={data.activeModel}>
  <svelte:fragment slot="breadcrumbs">
    <ul>
      <li><a href="/">Home</a></li>
      <li>Settings</li>
    </ul>
  </svelte:fragment>
  <svelte:fragment slot="right"></svelte:fragment>
</TopMenu>

<main class="container mx-auto">
  <h1 class="mb-4 text-4xl font-black">Settings</h1>
  <form class="flex flex-col" on:submit|preventDefault={onSubmit}>
    <div class="form-control">
      <label class="label" for="user-name">
        <span class="label-text">Name of user character</span>
      </label>
      <input
        id="user-name"
        type="text"
        class="input input-primary"
        placeholder="User"
        bind:value={data.config.userName}
      />
    </div>

    <div class="form-control">
      <label class="label" for="user-name">
        <span class="label-text">URL of the OpenAI-compatible endpoint</span>
      </label>
      <input
        id="user-name"
        type="text"
        class="input input-primary"
        placeholder="http://localhost:1234/v1"
        bind:value={data.config.apiUrl}
      />
    </div>

    <div class="form-control">
      <label class="label cursor-pointer">
        <span class="label-text"> Notifications for new messages </span>

        <input
          type="checkbox"
          class="checkbox"
          bind:checked={data.config.notifications.newMessage}
        />
      </label>
    </div>

    <div class="form-control">
      <label class="label" for="temperature">
        <span class="label-text">Temperature</span>
      </label>

      <input
        id="temperature"
        type="number"
        class="input input-primary"
        min="0"
        max="2"
        step="0.01"
        bind:value={data.config.temperature}
      />

      <div class="label">
        <span class="label-text-alt">
          Controls how "spicy" the generated answers are. Lower values are more conservative, higher
          values are more creative, values between 0 and 2.
        </span>
      </div>
    </div>

    <button type="submit" class="btn btn-primary mt-4 self-end">
      <Fa icon={faSave} />
      Save</button
    >
  </form>
</main>
