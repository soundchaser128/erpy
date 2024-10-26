import { invoke } from '@tauri-apps/api/core'

export const load = async (event) => {
    const backends = await invoke<string[]>("get_backends");

    return { backends }
}