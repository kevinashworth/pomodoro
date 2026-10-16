import { useEffect, useRef, useState } from "react";

import type { Mode, Status } from "@/types/pomodoro";

type RingProgressAnchor = {
  value: number;
  timestamp: number;
  remainingSeconds: number;
  status: Status;
  mode: Mode;
  phaseMaxSeconds: number;
  isDragging: boolean;
};

export function useAnimatedRemainingSeconds(
  remainingSeconds: number,
  status: Status,
  mode: Mode,
  phaseMaxSeconds: number,
  isDragging: boolean,
  endAt: number | null,
): number {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [previousIsDragging, setPreviousIsDragging] = useState(isDragging);
  const [visualRemainingSeconds, setVisualRemainingSeconds] = useState(remainingSeconds);
  const anchorRef = useRef<RingProgressAnchor | null>(null);

  // render-time state adjustment follows React’s pattern for adjusting state when an input changes, and avoids a synchronous state update inside the effect
  if (previousIsDragging !== isDragging) {
    setPreviousIsDragging(isDragging);

    if (previousIsDragging && !isDragging) {
      setVisualRemainingSeconds(remainingSeconds);
    }
  }

  // on mount. update prefersReducedMotion when media query changes, not every render
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", updatePreference);
    const frameId = window.requestAnimationFrame(updatePreference);

    return () => {
      window.cancelAnimationFrame(frameId);
      mediaQuery.removeEventListener("change", updatePreference);
    };
  }, []);

  // Keep the animation anchor current without restarting the frame loop on each tick.
  useEffect(() => {
    const previous = anchorRef.current;
    const timestamp = performance.now();
    let value = remainingSeconds;

    const samePhase = previous && mode === previous.mode && phaseMaxSeconds === previous.phaseMaxSeconds;
    const normalTick =
      previous &&
      status === "running" &&
      previous.status === "running" &&
      samePhase &&
      !isDragging &&
      !previous.isDragging &&
      !prefersReducedMotion &&
      remainingSeconds === previous.remainingSeconds - 1;

    if (normalTick) {
      value = previous.value - (timestamp - previous.timestamp) / 1000;
    } else if (previous?.status === "running" && status === "paused" && !previous.isDragging) {
      value = previous.value - (timestamp - previous.timestamp) / 1000;
    } else if (previous?.status === "paused" && status === "running" && !isDragging) {
      value = previous.value;
    }

    const anchor: RingProgressAnchor = {
      value,
      timestamp,
      remainingSeconds,
      status,
      mode,
      phaseMaxSeconds,
      isDragging,
    };
    anchorRef.current = anchor;
  }, [isDragging, mode, phaseMaxSeconds, prefersReducedMotion, remainingSeconds, status]);

  // Drive the animation directly from the wall-clock deadline when running.
  // This decouples the ring from integer poll cadence.
  useEffect(() => {
    if (status !== "running" || isDragging || prefersReducedMotion || endAt == null) return;

    let frameId = 0;
    const updateFrame = () => {
      const target = endAt;
      if (target == null) {
        frameId = window.requestAnimationFrame(updateFrame);
        return;
      }

      const nextValue = Math.max(0, (target - Date.now()) / 1000);
      setVisualRemainingSeconds(nextValue);
      frameId = window.requestAnimationFrame(updateFrame);
    };

    frameId = window.requestAnimationFrame(updateFrame);
    return () => window.cancelAnimationFrame(frameId);
  }, [isDragging, prefersReducedMotion, status, endAt]);

  // Fallback: keep the original rAF smoothing against the integer anchor when endAt is not present.
  // This covers edge cases and keeps reduced motion behavior.
  useEffect(() => {
    if (status !== "running" || isDragging || prefersReducedMotion || endAt != null) return;

    let frameId = 0;
    const updateFrame = (frameTimestamp: number) => {
      const current = anchorRef.current;
      if (!current || current.status !== "running" || current.isDragging) return;

      const elapsedSeconds = Math.max(0, frameTimestamp - current.timestamp) / 1000;
      const nextValue = Math.max(0, current.value - elapsedSeconds);
      anchorRef.current = { ...current, value: nextValue, timestamp: frameTimestamp };
      setVisualRemainingSeconds(nextValue);
      frameId = window.requestAnimationFrame(updateFrame);
    };

    frameId = window.requestAnimationFrame(updateFrame);
    return () => window.cancelAnimationFrame(frameId);
  }, [isDragging, prefersReducedMotion, status, endAt]);

  if (isDragging) {
    return remainingSeconds;
  }

  if (status !== "running" || prefersReducedMotion) {
    return status === "paused" ? visualRemainingSeconds : remainingSeconds;
  }

  return visualRemainingSeconds;
}
