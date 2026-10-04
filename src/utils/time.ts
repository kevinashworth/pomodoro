export function clampRemaining(seconds: number, running: boolean, maxSeconds: number): number {
  const min = running ? 1 : 0;
  return Math.max(min, Math.min(maxSeconds, seconds));
}

export function getDayId(now: Date, resetHour: number): string {
  const shifted = new Date(now);
  shifted.setHours(
    shifted.getHours() - resetHour,
    shifted.getMinutes(),
    shifted.getSeconds(),
    shifted.getMilliseconds(),
  );
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const d = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatClock(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
