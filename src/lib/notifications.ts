import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function createNotification(title: string, body: string, isLarge = false) {
  // Do you have permission to send a notification?
  let permissionGranted = await isPermissionGranted();

  // If not we need to request it
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }

  // Once permission has been granted we can send the notification
  if (permissionGranted) {
    const isWindowFocused = document.hasFocus();

    if (!isWindowFocused) {
      sendNotification({ title, [isLarge ? "largeBody" : "body"]: body });
    }
  }
}
