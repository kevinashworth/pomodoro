# Known Issues

Latent issues and small cleanups, documented so they can be picked at a future date. None affect production behavior today.

## Small size

1. **Same nested-setter shape in the rollover poll**: `setSessionsCompletedToday(0)` inside the `setSessionsCompletedDayId` updater (`use-pomodoro-timer.ts`). Idempotent today; flatten for consistency if the effect is ever touched.
2. **Background completion cues in the web build**: the countdown is now wall-clock accurate (`endAt`), so the display self-corrects on refocus. But a backgrounded browser tab can still throttle the completion tick and suppress WebAudio/`Notification` until it is refocused, so the phase-end cue may arrive late. The Tauri desktop build avoids this via the native scheduler (`schedule_timer`), which owns the alarm and the menu-bar clock. Web-only limitation; acceptable.
3. **`dailyResetHour` is not user-configurable**: it is persisted in `TimerState` but always `DEFAULT_DAILY_RESET_HOUR`; no settings UI writes it. Expose it in settings or drop it from the persisted shape.
4. **`DEFAULT_TIMER_STATE.remainingSeconds` is unused**: `remainingSeconds` now lazy-initializes from the configured work minutes (initial mode is always `work`). The field remains only to document the default state shape.
5. **Clamp is one-directional**: raising a duration mid-session does not rescale upward, and an idle timer at full duration does not follow a raised setting. Locked in by the test `does not rescale the remaining time upward when the phase duration grows`. Revisit only if proportional rescale (or idle-follows-setting) is the wanted UX.
6. **Restore advances at most one phase**: a running timer restored after more than one full phase elapsed moves to the next phase idle and discards the remaining elapsed time. Defensible (avoids silently racking up completions); revisit if multi-phase catch-up matters.
7. **30s rollover poll is now only a backstop**: any render syncs the daily count immediately at the day boundary, so the poll matters only for a completely idle app. Harmless either way.
