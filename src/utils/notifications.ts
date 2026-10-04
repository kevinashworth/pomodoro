import type { Mode } from "@/types/pomodoro";

export default function notifyPhaseEnd(nextMode: Mode): void {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const label = nextMode === "break" ? "Break ready" : "Work ready";
  new Notification(`Pomodoro: ${label}`, {
    body: "Open the timer to start the next phase.",
    silent: true,
  });
}
