import type { SyncState, Unsubscribe } from "@evolu/common";
import type { ErpyStorage } from "./storage";

export type State = { sync: SyncState | undefined };

export const syncState: State = $state({ sync: undefined });
let unsubscribeFn: Unsubscribe | undefined = $state(undefined);

export function subscribeToSyncState(database: ErpyStorage) {
  const unsub = database.onSyncStateChange((state) => {
    // log("sync state changed", state);
    syncState.sync = state;
  });

  unsubscribeFn = unsub;
}

export function unsubscribe() {
  if (unsubscribeFn) {
    unsubscribeFn();
  }
}
