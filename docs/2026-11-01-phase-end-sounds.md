# Phase-End Sounds

## What it does

- Replaces the single synthesized chime with two independently selectable phase-end sounds: one for the end of focused work, one for the end of a break.
- Both pickers live in Settings under the Sound checkbox and offer the curated mp3 catalog plus **None**.
- Selecting a sound previews it immediately.
- Long clips (notably the 19.8s guitar loop, the default break-end sound) fade out over 200ms when the next phase is started.
- Skip is now silent: it plays no sound and sends no notification. Reset is silent too.

## Architecture

- **Catalog** (`src/constants/sounds.ts`): flat `SOUNDS` array of `{ id, label, src, volume }`. `SoundId` is derived from it. Defaults are `fanfare` (work end) and `guitar-loop` (break end).
- **Provider** (`src/context/sounds.tsx`): creates one Howler `Howl` per catalog entry in a mount effect and exposes `playSound(id)` and `fadeOutActiveSound()`. It tracks the active sound id and schedules generation-safe fade cleanups so replaying a fading sound cannot be stopped by the previous timer. The catalog drives the loop directly; adding a sound needs no provider edit.
- **Persistence**: `PomodoroSettings` gains `workEndSound` and `breakEndSound` (`SoundId | null`). The loader normalizes `undefined` and invalid ids to defaults, and preserves `null`. The storage key stays `pomodoro.settings.v3`; the extra fields are backward compatible.
- **Timer** (`src/hooks/use-pomodoro-timer.ts`): `transitionToNextPhase(fromMode, announce)` sets a `phaseEndEvent` only for natural countdown completion. An effect consumes the event once (identity-guarded) and plays the ended phase's sound and notification. `skip()` passes `announce: false`.
- **Start/Resume** calls `fadeOutActiveSound()` before setting `running`.

## Behavior matrix

| Trigger         | Sound           | Notification | Fade                      |
| --------------- | --------------- | ------------ | ------------------------- |
| Work reaches 0  | `workEndSound`  | if enabled   | —                         |
| Break reaches 0 | `breakEndSound` | if enabled   | —                         |
| Skip            | none            | none         | —                         |
| Reset           | none            | none         | —                         |
| Start / Resume  | —               | —            | active sound over 200ms   |
| Leave Settings  | —               | —            | active preview over 200ms |

The **Play Sounds** toggle gates phase-end playback only. Previews still work with it off, which leaves room for future sound categories (ticking, checkbox feedback) to use the same provider.

## Notes and tradeoffs

- The app uses Howler directly for all audio; `use-sound` has been removed. Driving Howler directly gives future features access to sprites and seeking without a hook wrapper.
- Eight Howls preload roughly 700 KB of audio at startup.
- jsdom has no audio backend, so unit tests mock `howler` globally and assert the provider's wiring rather than real playback.
- The settings frame is fixed at 280×454. The two pickers are compact rows; if they overflow in practice, the fallback is a scrollable settings body.
- `howler` and `@types/howler` are now direct dependencies because the provider touches `Howl.fade` and `Howl.volume` directly.
