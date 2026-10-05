# Known Issues

Latent issues and small cleanups, documented so they can be picked at a future date. None affect production behavior today.

## Medium size

### 1. StrictMode: chime/notification double-fire on phase transition (dev-only, latent)

The countdown tick calls `transitionToNextPhase(mode)` inside the `setRemainingSeconds` updater (`src/hooks/use-pomodoro-timer.ts`). Updaters must be pure; StrictMode double-invokes them in development, so `playSoftChime()` and `notifyPhaseEnd()` fire twice per transition.

- **Why latent**: the app is not StrictMode-wrapped (`src/main.tsx`), and updater double-invocation is dev-only.
- **What is already safe**: the session count. Phase transitions dispatch absolute values (flattened in Phase 3), so double-invocation cannot double-increment. Guarded by the StrictMode test `a completed work phase increments the count exactly once`.
- **Fix direction (attempted, reverted)**: make the tick updater pure (`Math.max(0, prev - 1)`) and advance phases from an effect watching `status === "running" && remainingSeconds === 0`. This works and is test-verified, but `react-hooks/set-state-in-effect` flags the transition effect (it traces the `setState` calls through `transitionToNextPhase`). A lint-clean version needs the transition split into render-time state adjustment + an effect for sound/notification keyed on the mode change (guarded against hydration).
- **Side effects of that restructure to watch for**: a one-frame `00:00` commit before the transition effect runs, and the persist effect briefly saving a `running @ 0` snapshot (harmless — restore clamps running to ≥ 1s).

## Small size

1. **Same nested-setter shape in the rollover poll**: `setSessionsCompletedToday(0)` inside the `setSessionsCompletedDayId` updater (`use-pomodoro-timer.ts`). Idempotent today; flatten for consistency if the effect is ever touched.
2. **Timer drift**: the tick decrements once per `setInterval` firing rather than measuring wall-clock elapsed. Background-tab throttling drifts the clock until the next reload (restore reconciles via `updatedAt`). A wall-clock fix would compute remaining from a target end timestamp.
3. **`dailyResetHour` is not user-configurable**: it is persisted in `TimerState` but always `DEFAULT_DAILY_RESET_HOUR`; no settings UI writes it. Expose it in settings or drop it from the persisted shape.
4. **`DEFAULT_TIMER_STATE.remainingSeconds` is unused**: `remainingSeconds` now lazy-initializes from the configured work minutes (initial mode is always `work`). The field remains only to document the default state shape.
5. **Clamp is one-directional**: raising a duration mid-session does not rescale upward, and an idle timer at full duration does not follow a raised setting. Locked in by the test `does not rescale the remaining time upward when the phase duration grows`. Revisit only if proportional rescale (or idle-follows-setting) is the wanted UX.
6. **Restore advances at most one phase**: a running timer restored after more than one full phase elapsed moves to the next phase idle and discards the remaining elapsed time. Defensible (avoids silently racking up completions); revisit if multi-phase catch-up matters.
7. **30s rollover poll is now only a backstop**: any render syncs the daily count immediately at the day boundary, so the poll matters only for a completely idle app. Harmless either way.
