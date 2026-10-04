# Development

## Versioning

`package.json` is the single source of truth for the app version.

- `tauri.conf.json` reads it via `"version": "../package.json"`.
- `Cargo.toml` is synced by the `version` npm script.

The `tauri.conf.json` version takes precedence over `Cargo.toml`'s for everything
user-facing (e.g. macOS `CFBundleShortVersionString`, Android/iOS bundle versions).
`package-lock.json` and `Cargo.lock` update automatically and are never hand-edited.

### Bumping the version

```sh
npm version patch --ignore-scripts=false # patch, minor, or major
```

The `--ignore-scripts=false` flag is required because npm lifecycle scripts
(`version`, `postversion`, etc.) are disabled whenever `ignore-scripts=true` is set
— for example in a personal `~/.npmrc`. A CLI flag takes precedence over both user
and project `.npmrc` files, so it works whether or not a contributor has that setting.
If they don't, the flag is simply a no-op.

Do **not** add `ignore-scripts=false` to a repo-level `.npmrc`: that would silently
override a contributor's personal security setting for every npm command, not just
releases. Keep it scoped to this one command.

The `version` script runs `cargo set-version` to keep `src-tauri/Cargo.toml` in sync
and stages it, so `npm version` commits the Cargo files together with `package.json`
and the tag.

### Prerequisites

`cargo set-version` is provided by [cargo-edit](https://github.com/killercup/cargo-edit)
(not bundled with Rust). Install once:

```sh
cargo install cargo-edit
```

### Releasing

```sh
npm version <patch|minor|major> --ignore-scripts=false
npm run build:tauri
```
