# Tauri Migration Plan

## Goals

- Package the existing Vite/React Pomodoro app as a desktop app without changing timer behavior.
- Keep the current `/` and `/playground` routes, settings dialog, persistence, and Playwright coverage intact.
- Add a thin native shell only where desktop features are needed.

## Steps

1. Add Tauri app scaffolding around the current Vite frontend.
2. Configure the desktop window, dev server, and production asset loading.
3. Wire any required native capabilities for file, window, or system integration.
4. Keep app state and timer logic in the existing React layer.
5. Validate the desktop build alongside the current web checks.

## Relevant Files

- [package.json](package.json)
- [vite.config.mts](vite.config.mts)
- [src/App.tsx](src/App.tsx)
- [src/main.tsx](src/main.tsx)
- [src/components/pomodoro-timer.tsx](src/components/pomodoro-timer.tsx)
- [src/components/pomodoro-settings-dialog.tsx](src/components/pomodoro-settings-dialog.tsx)
- [tests/pomodoro.spec.ts](tests/pomodoro.spec.ts)

## Verification

- `npm run lint`
- `npm run build`
- `npm run test:e2e`
- Desktop launch smoke test for the packaged app
- Confirm reload, pause/resume, skip, and settings flows still behave the same in the native shell

## Decisions

- Reuse the current Vite app rather than rebuilding UI for desktop.
- Keep Tauri integration thin and avoid moving timer logic into native code.
- Preserve the current localStorage-based persistence unless a desktop-specific need requires a native store.

## Further Considerations

- Decide whether the window should close to tray or exit immediately.
- Define update, signing, and platform permission requirements before release.
- Add any native integrations only after the core desktop shell is stable.

## And now a copy of chats re Tauri, as Copilot credits are done.

### 1

For this repo, the main thing to understand is that Tauri is not just a UI wrapper. It gives you a native desktop shell, but it does not run a Next.js server for you. Since this Pomodoro app is mostly client-side, Tauri is feasible here, but you need to choose how the Next frontend will be delivered.

#### What you need

1. Rust installed
   `rustup`, `cargo`, and the platform toolchain.
   On macOS, that usually means Xcode Command Line Tools too.

2. Tauri dependencies
   In the JS app:
   `@tauri-apps/cli`
   `@tauri-apps/api`

In the repo:
a `src-tauri/` directory with Rust files, `Cargo.toml`, and `tauri.conf.json`.

3. A frontend strategy
   This is the real architectural decision for your project:

- Best fit here: make the app static/client-only and let Tauri load built assets.
- Harder option: keep Next SSR and run a Node server as a sidecar or separate process.
- Alternative: move the UI off Next and onto Vite/React for a cleaner desktop setup.

Because your timer app is already heavily client-side, the static approach is likely the right one.

#### What that means for this Next app

If you want Tauri with minimal pain, you should expect to:

1. Ensure the app can run without server-side Next features.
   App Router pages that depend on SSR, route handlers, or server actions complicate Tauri a lot.

2. Configure Next for a static build.
   That usually means generating static assets instead of expecting a live Node server.

3. Point Tauri at:

- a dev URL during development, such as your local frontend dev server
- a built frontend directory for production packaging

4. Add the desktop shell layer:

- window config
- app metadata
- icons
- permissions
- optional native commands in Rust if you want filesystem, tray, notifications, etc.

#### For this Pomodoro repo specifically

This app looks like a strong Tauri candidate because:

- the timer logic is client-side
- settings are local-state/localStorage oriented
- the UI is a single-window desktop-style surface already

The main checks I’d do before committing to Tauri are:

- confirm there is no real SSR requirement
- confirm no Next server APIs are required
- decide whether browser notifications should stay web-style or move to Tauri native notifications
- decide whether localStorage is enough or whether desktop persistence should move to a Tauri-backed store

#### Practical minimum setup

You’d typically need:

- Rust toolchain installed
- Tauri CLI added
- src-tauri/ scaffolded
- Next configured for a static desktop-friendly build
- Tauri config wired to your frontend dev/build outputs

If you want, I can inspect this repo and tell you the exact gaps to make this specific Pomodoro app Tauri-ready, or I can produce the step-by-step migration plan.

### 2

Great, with your app already on Vite, Rust is the biggest prerequisite. After that, here is what you still need.

Minimum to run locally

1. macOS toolchain

- Install Xcode Command Line Tools
- Confirm clang is available

2. Tauri dependencies in the project

- Add Tauri CLI as a dev dependency
- Add Tauri API package for frontend calls when needed

3. Initialize Tauri shell

- Run Tauri init in the repo
- This creates the Rust side folder and config files

4. Wire Tauri to your Vite app

- Dev URL should point to your Vite dev server
- Build output path should point to your Vite dist folder

5. Add scripts

- Add script for tauri dev
- Add script for tauri build

6. Run locally

- Start with tauri dev and confirm the desktop window opens your app

What you should decide early

1. Notifications

- Browser Notification API may not behave exactly as expected in desktop packaging
- Decide whether to keep web notifications or move to Tauri notification plugin

2. Persistence

- Your localStorage approach will work, but it is WebView-scoped
- Decide if that is enough or if you want native storage later

3. Window and app behavior

- App name, size, min size, resizable, always-on-top, tray, shortcuts

Needed for shipping on macOS (not needed for first local run)

1. Apple signing

- Apple Developer account
- Signing identity and provisioning setup

2. Notarization

- Required for smooth distribution outside your own machine

3. CI build strategy

- Build artifacts per architecture or universal binary
- Optional auto-updater setup

Quick sanity checklist before you start

- Rust installed and cargo in PATH
- Xcode command line tools installed
- Vite app builds cleanly
- No runtime dependency on a Node server
- Clear decision on notifications and storage for desktop

If you want, once you install Rust I can do the next step directly: scaffold Tauri in this repo and wire the exact config/scripts for your current Vite setup.
