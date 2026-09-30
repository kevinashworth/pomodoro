# Pomodoro

A Pomodoro timer for the browser and desktop (Tauri), built with Vite, React, TypeScript, and Tailwind CSS.

## Commands

- `npm run dev` — Vite dev server
- `npm run check:types` — `tsc --noEmit`
- `npm run lint` — ESLint
- `npm run test:unit` — Vitest unit tests
- `npm run test:e2e` — Playwright end-to-end tests
- `npm run tauri dev` / `npm run tauri build` — desktop app

## Layout

- `src/` — React app (components, pages, hooks, constants, utils)
- `src-tauri/` — Tauri/Rust desktop shell with native menu
- `scripts/` — build helpers (e.g. window-size config sync)
- `tests/` — Playwright end-to-end suite
- `docs/` — design notes