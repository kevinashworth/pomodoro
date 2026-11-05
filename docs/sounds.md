# Sounds

The app plays a sound whenever a timer phase ends and, optionally, on a
repeating tick at the start of each phase and on every whole minute. Which
sound plays is a user preference: the phase-end sounds are chosen separately
for focused work and breaks, and the tick has its own picker.

## Provenance

Playback is driven directly by [Howler](https://howlerjs.com/). An earlier
prototype used `@mrmartineau/use-sound`; it has been removed so the app has a
single audio path. Most mp3s in `/public/sounds` came from
<https://github.com/joshwcomeau/use-sound/tree/main/stories/sounds>,
including `pop.mp3`. The tick sound `tick-tock.mp3` came from
<https://pixabay.com/sound-effects/household-clock-tick-tik-tak-76043/>
(originally downloaded as `freesound_community-clock-tick-tik-tak-76043.mp3`).

## Catalog

Sounds are grouped by where they can be selected (`src/constants/sounds.ts`) and
then concatenated into one flat catalog for playback.

Phase-end pickers:

| Sound       | File              | Duration | Volume |
| ----------- | ----------------- | -------- | ------ |
| 909 Drums   | `909-drums.mp3`   | 1.3s     | 0.4    |
| Boop        | `boop.mp3`        | 0.4s     | 0.35   |
| Dun Dun Dun | `dun-dun-dun.mp3` | 2.3s     | 0.5    |
| Fanfare     | `fanfare.mp3`     | 2.6s     | 0.5    |
| Guitar Loop | `guitar-loop.mp3` | 19.8s    | 0.25   |
| Meow        | `meow.mp3`        | 0.5s     | 0.3    |
| Pfff        | `pfff.mp3`        | 2.0s     | 0.4    |
| Rising Pops | `rising-pops.mp3` | 0.4s     | 0.35   |

Tick picker:

| Sound     | File            | Duration | Volume |
| --------- | --------------- | -------- | ------ |
| Pop       | `pop.mp3`       | 0.1s     | 0.3    |
| Tick Tock | `tick-tock.mp3` | 2.1s     | 0.25   |

Each picker also offers **None**, stored as `null`.

Only these ten mp3s are kept in `/public/sounds`; the catalog and the folder
mirror each other, so there are no unused audio assets.

## Defaults

- Work ends → **Fanfare**
- Break ends → **Guitar Loop**
- Every minute → **Tick Tock**

All three are persisted alongside the other settings under
`pomodoro.settings.v3`. Legacy settings without the new fields fall back to these
defaults; unknown ids and ids from the wrong category also fall back, while
`null` is preserved.

## Architecture

- `src/constants/sounds.ts` groups entries into `PHASE_END_SOUNDS` and
  `TICK_SOUNDS`, then exposes the combined `SOUNDS` catalog and `SoundId`.
- `src/context/sounds.tsx` (`SoundsProvider`) creates one Howler `Howl` per
  catalog entry and exposes `playSound(id)` and `fadeOutActiveSound()`.
  - The catalog drives creation directly, so adding a sound does not require
    editing the provider.
  - Starting a new sound fades the previous one over `SOUND_FADE_MS` (200ms).
  - Re-playing the same id cancels its pending fade, stops the old playback and
    restarts it at the catalog volume.
  - Fades restore the Howl's base volume after stopping so a later replay is not
    silent.
  - Howls preload on mount and are unloaded when the provider unmounts.
- `use-sound` has been removed; the app uses Howler directly everywhere.
- `src/hooks/use-pomodoro-timer.ts` announces a natural phase end with an
  explicit `phaseEndEvent`. The event picks the sound for the phase that
  **ended** (work → `workEndSound`, break → `breakEndSound`).
- The same hook plays `tickSound` on a genuine phase start (idle → running) and
  whenever `remainingSeconds` reaches a whole-minute mark while running. A
  `lastTickMinuteRef` prevents the start tick, a resume, or hydration from
  replaying the same minute. Starting at a non-whole minute waits for the next
  whole-minute mark.
- `src/pages/settings.tsx` renders the three pickers and previews a sound on
  selection.

## Behavior

| Event                        | Sound                   | Notification |
| ---------------------------- | ----------------------- | ------------ |
| Work countdown reaches 0     | `workEndSound`          | if enabled   |
| Break countdown reaches 0    | `breakEndSound`         | if enabled   |
| Start (idle → running)       | `tickSound`             | none         |
| Each whole-minute mark       | `tickSound`             | none         |
| Resume (paused → running)    | none                    | none         |
| Pause                        | none                    | none         |
| Skip                         | none                    | none         |
| Reset                        | none                    | none         |

Starting or resuming still fades any phase-end sound that is already playing.
The tick is skipped at `remainingSeconds === 0`; the phase-end sound takes over
there.

The **Play Sounds** checkbox gates phase-end and tick playback. Sound pickers
stay active when it is off, and previews still play. Leaving Settings fades any
preview that is still playing.

## Testing

`howler` is mocked globally in `tests/setup.ts` with a recording fake
(`src/test/sound-mock.ts`) because jsdom has no audio backend. Tests assert
which clip plays, when it fades, and that its volume is restored. Timer tests
also cover the start tick, whole-minute ticks, pause/resume, None, and the
Play Sounds gate.
