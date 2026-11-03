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
- **Desktop and menu-bar modes** (Tauri) — launches as a normal macOS desktop
  app and can switch to a menu-bar popup from Settings
- **Native desktop menu** (Tauri) — `⌘,` opens settings, `⌘1` returns to the
  timer, `⌘W` closes, `⌘Q` quits

## Development

```bash
npm install
npm run dev            # web dev server
npm run dev:tauri      # desktop app in dev mode
```

## Checks

```bash
npm run check:types    # tsc --noEmit
npm run lint           # ESLint
npm run format         # Prettier
npm run test:unit      # Vitest unit tests
npm run test:e2e       # Playwright end-to-end tests
npm run build:tauri    # build the desktop app
```

## Project layout

- `src/` — React app (timer, settings, components, hooks, utilities)
- `src-tauri/` — Tauri desktop shell (Rust, native application menu, tray)
- `tests/` — Playwright end-to-end suite
- `docs/` — design notes
