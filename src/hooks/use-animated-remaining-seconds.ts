import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void): () => void {
  if (typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// Fractional seconds left, for drawing the ring smoothly between whole-second
// updates. While running, each animation frame reads the end time directly. A
// stopped timer stores exact milliseconds, so a paused ring stays where it was.
// Dragging and reduced motion follow the whole seconds shown on the clock.
export function useAnimatedRemainingSeconds({
  endAt,
  remainingMs,
  remainingSeconds,
  isDragging,
}: {
  endAt: number | null;
  remainingMs: number;
  remainingSeconds: number;
  isDragging: boolean;
}): number {
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, prefersReducedMotion, () => false);
  // Tagged with the end time it was measured against, so a frame from before a
  // start, an edit, or a resume is never shown.
  const [frame, setFrame] = useState<{ endAt: number; seconds: number } | null>(null);

  useEffect(() => {
    if (endAt === null || isDragging || reducedMotion) return;

    let frameId = 0;
    const draw = () => {
      setFrame({ endAt, seconds: Math.max(0, endAt - Date.now()) / 1000 });
      frameId = window.requestAnimationFrame(draw);
    };

    frameId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frameId);
  }, [endAt, isDragging, reducedMotion]);

  if (isDragging) return remainingSeconds;
  if (endAt === null) return remainingMs / 1000;
  if (reducedMotion || frame?.endAt !== endAt) return remainingSeconds;
  return frame.seconds;
}
