# Sounds

The app plays a sound whenever a timer phase ends. Which sound plays is a user
preference, chosen separately for the end of focused work and the end of a break.

## Provenance

Playback is driven directly by [Howler](https://howlerjs.com/). An earlier
prototype used `@mrmartineau/use-sound`; it has been removed so the app has a
single audio path. The mp3s in `/public/sounds` came from
<https://github.com/joshwcomeau/use-sound/tree/main/stories/sounds>.

## Catalog

Only a curated subset is offered for phase ends (`src/constants/sounds.ts`):

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

Each picker also offers **None**, stored as `null`.

Only these eight mp3s are kept in `/public/sounds`; the catalog and the folder
mirror each other, so there are no unused audio assets.

## Defaults

- Work ends → **Fanfare**
- Break ends → **Guitar Loop**

Both are persisted alongside the other settings under
`pomodoro.settings.v3`. Legacy settings without the new fields fall back to these
defaults; unknown ids also fall back, while `null` is preserved.

## Architecture

- `src/constants/sounds.ts` is the flat catalog (`SOUNDS`, `SoundId`).
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
- `src/pages/settings.tsx` renders the two pickers and previews a sound on
  selection.

## Behavior

| Event                     | Sound                   | Notification |
| ------------------------- | ----------------------- | ------------ |
| Work countdown reaches 0  | `workEndSound`          | if enabled   |
| Break countdown reaches 0 | `breakEndSound`         | if enabled   |
| Skip                      | none                    | none         |
| Reset                     | none                    | none         |
| Start / Resume            | fades any playing sound | —            |

The **Play Sounds** checkbox gates phase-end playback only. Sound pickers stay
active when it is off, and previews still play. Leaving Settings fades any
preview that is still playing.

## Testing

`howler` is mocked globally in `tests/setup.ts` with a recording fake
(`src/test/sound-mock.ts`) because jsdom has no audio backend. Tests assert
which clip plays, when it fades, and that its volume is restored.
