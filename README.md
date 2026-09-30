# Pomodoro

A Pomodoro timer that runs in the browser and as a desktop app, built with
Vite, React, TypeScript, and Tailwind CSS, packaged with Tauri.

## Features

- **Focused Work / Break phases** with a circular countdown ring
- **Draggable ring knob** to scrub the remaining time (works while running or paused)
- **Skip** any phase with an inline confirmation dialog
- **Daily session tracking** that resets automatically at 3:00 AM
- **Settings page** for work/break durations (1–60 min), sound, and notifications
- **State persistence** — restores the timer across reloads and reconciles elapsed time
- **Keyboard controls** — `Space` toggles start/pause, `Escape` backs out
- **Native desktop menu** (Tauri) — `⌘,` opens settings, `⌘1` returns to the timer, `⌘Q` quits

## Development

```bash
npm install
npm run dev            # web dev server
npm run tauri dev      # desktop app in dev mode
```

## Checks

```bash
npm run check:types    # tsc --noEmit
npm run lint           # ESLint
npm run test:unit      # Vitest unit tests
npm run test:e2e       # Playwright end-to-end tests
npm run tauri build    # build the desktop app
```

## Project layout

- `src/` — React app (timer, settings, components, hooks, utilities)
- `src-tauri/` — Tauri desktop shell (Rust, native application menu)
- `scripts/` — build helpers (e.g. window-size config sync)
- `tests/` — Playwright end-to-end suite
- `docs/` — design notes
