# Vite Migration Plan

This document tracks the migration of the Pomodoro app from Next.js to Vite + React while preserving current behavior, styling, and Playwright coverage.

## Goals

- Preserve the existing Pomodoro timer and dialog behavior.
- Keep the `/` and `/playground` routes working.
- Use standard web fonts for now.
- Remove the Next.js runtime and tooling surface.
- Leave Tauri integration for a later phase.

## Steps

1. Add the Vite application scaffold and root HTML.
2. Replace Next app-directory routes with React Router pages.
3. Move global styles to a Vite entry stylesheet and drop `next/font`.
4. Remove Next-only component markers where they are no longer needed.
5. Replace Next-specific package/tooling configuration.
6. Update Playwright to start the Vite dev server.
7. Delete Next-only files once the Vite shell is in place.
8. Validate with lint, build, and Playwright.

## Notes

- Standard system fonts are intentionally used in this pass.
- `src/components/` remains the core reusable UI surface.
- Any Tauri-specific work should start only after the Vite web app reaches parity.
