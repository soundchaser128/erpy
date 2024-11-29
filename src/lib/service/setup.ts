const localStorageKey = "firstTimeSetupCompleted";

export function setupCompleted(): boolean {
  return window.localStorage.getItem(localStorageKey) === "true";
}

export function setSetupCompleted() {
  window.localStorage.setItem(localStorageKey, "true");
}
