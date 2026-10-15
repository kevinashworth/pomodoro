import { isPermissionGranted, requestPermission, sendNotification } from "@tauri-apps/plugin-notification";
import { IS_WEB } from "@/constants/env";

import type { Options } from "@tauri-apps/plugin-notification";
import type { Mode } from "@/types/pomodoro";

type NotificationProps = Required<Pick<Options, "title" | "body">>;

const TITLE = "Pomodoro";
const SHORT_LABELS: Record<Mode, string> = {
  break: "Focused Work ended",
  work: "Break finished",
};

async function notifyPhaseEnd(nextMode: Mode) {
  const title = TITLE;
  const body = SHORT_LABELS[nextMode];
  await enqueueNotification({ title, body });
}

async function enqueueNotification({ title, body }: NotificationProps) {
  if (await checkPermissionIsomorphic()) {
    sendNotificationIsomorphic({ title, body });
  }
}

async function checkPermissionWeb() {
  if (typeof window === "undefined") return false;
  if (typeof Notification === "undefined" || Notification.permission === "denied") {
    return false;
  }
  if (Notification.permission !== "granted" && (await Notification.requestPermission()) !== "granted") {
    return false;
  }
  return true;
}

async function checkPermissionIsomorphic() {
  if (IS_WEB) {
    if (!(await checkPermissionWeb())) {
      return false;
    }
  }
  if (!(await isPermissionGranted())) {
    return (await requestPermission()) === "granted";
  }
  return true;
}

async function sendNotificationWeb({ title, body }: { title: string; body: string }) {
  if (typeof window === "undefined") return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  new Notification(title, { body, silent: true });
}

async function sendNotificationIsomorphic({ title, body }: { title: string; body: string }) {
  if (IS_WEB) {
    sendNotificationWeb({ title, body });
    return;
  }
  sendNotification({ title, body });
}

export { checkPermissionIsomorphic as checkPermission, notifyPhaseEnd, TITLE, SHORT_LABELS };
