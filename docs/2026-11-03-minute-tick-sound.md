# Minute Tick Sound

## What it does

- Adds an optional tick sound that plays when a phase starts and again on every whole-minute mark while the phase is running.
- The tick is one shared setting for both work and break phases, selected from its own **Every minute** picker.
- The picker offers **None** to disable ticking, and respects the existing **Play Sounds** checkbox.
- Default is **Tick Tock**.

## Architecture

- **Catalog** (`src/constants/sounds.ts`): entries are grouped into `PHASE_END_SOUNDS` and `TICK_SOUNDS`, then concatenated into the flat `SOUNDS` list used by the provider. `pop` and `tick-tock` belong to the tick group only, so the phase-end pickers are unchanged.
- **Persistence**: `PomodoroSettings` gains `tickSound` (`SoundId | null`). The loader defaults a missing value to `tick-tock`, preserves `null`, and falls back for ids that are not tick sounds. The storage key stays `pomodoro.settings.v3`.
- **Timer** (`src/hooks/use-pomodoro-timer.ts`): starting from idle plays the tick and seeds `lastTickMinuteRef`. While running, an effect plays the tick when `remainingSeconds` lands on a whole-minute mark and that minute has not already played. Resuming from pause does not replay the start tick, and hydration seeds the ref without playing.
- **Settings** (`src/pages/settings.tsx`): a third picker previews selections through the existing `playSound`/`fadeOutActiveSound` path.

## Behavior matrix

| Trigger                    | Tick            | Phase-end sound |
| -------------------------- | --------------- | --------------- |
| Start (idle → running)     | `tickSound`     | —               |
| Each whole-minute mark     | `tickSound`     | —               |
| Resume (paused → running)  | none            | —               |
| Countdown reaches 0        | none            | selected sound  |
| Pause / Skip / Reset       | none            | none            |

## Notes and tradeoffs

- Ticks are driven by the countdown values, not wall-clock time. A throttled or heavily delayed interval can land up to one second late.
- The last second belongs to the phase-end sound; the tick never plays at `remainingSeconds === 0`.
- Both new mp3s are documented in `docs/sounds.md`, including `tick-tock.mp3`'s Pixabay provenance.
