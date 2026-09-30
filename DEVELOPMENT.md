# Development

## Versioning

`package.json` is the single source of truth for the app version.

- `tauri.conf.json` reads it via `"version": "../package.json"`.
- `Cargo.toml` is synced by the `postversion` npm script.

The `tauri.conf.json` version takes precedence over `Cargo.toml`'s for everything
user-facing (e.g. macOS `CFBundleShortVersionString`, Android/iOS bundle versions).
`package-lock.json` and `Cargo.lock` update automatically and are never hand-edited.

### Bumping the version

```sh
npm version patch   # or minor / major
```

`npm version` bumps `package.json`, then `postversion` runs `cargo set-version` to
keep `src-tauri/Cargo.toml` in sync.

### Prerequisites

`cargo set-version` is provided by [cargo-edit](https://github.com/killercup/cargo-edit)
(not bundled with Rust). Install once:

```sh
cargo install cargo-edit
```

### Releasing

```sh
npm version patch && npm run tauri build
```
