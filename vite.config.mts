import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const MAX_UNTRACKED_FILE_BYTES = 512 * 1024; // 0.5 MB

// Identifies the current working tree in dev, so multiple running instances can
// be distinguished on the settings page. Dirty trees also get a short hash of the
// uncommitted changes, so two dirty trees on the same commit look different.
function getDevBuildId(): string {
  const git = (args: string[]) => execFileSync("git", args, { maxBuffer: 10 * 1024 * 1024 }).toString();

  let sha: string;
  try {
    sha = git(["rev-parse", "--short", "HEAD"]).trim();
  } catch {
    return "unknown";
  }

  try {
    const trackedDiff = git(["diff", "HEAD"]);
    const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean);

    if (!trackedDiff && untracked.length === 0) return sha;

    let workingTree = trackedDiff;
    for (const file of untracked) {
      const filePath = path.resolve(import.meta.dirname, file);
      workingTree += `\0${file}\0`;
      try {
        const stat = statSync(filePath);
        // Large files are represented by metadata instead of their contents so a
        // stray dump or log cannot slow down every config load.
        workingTree +=
          stat.size > MAX_UNTRACKED_FILE_BYTES ? `${stat.size}\0${stat.mtimeMs}` : readFileSync(filePath, "utf8");
      } catch {
        // Unreadable files still contribute their path above.
      }
    }

    const diffHash = createHash("sha1").update(workingTree).digest("hex").slice(0, 4);
    return `${sha}.${diffHash}`;
  } catch {
    // A dirty-tree failure should still leave the commit identifiable.
    return sha;
  }
}

export default defineConfig(({ command }) => ({
  plugins: [react()],
  clearScreen: false,
  envPrefix: ["VITE_", "TAURI_"],
  define: {
    // Only expose a dev marker when serving; production builds get an empty
    // string so the release version stays exactly as genversion emits it.
    __DEV_BUILD_ID__: JSON.stringify(command === "serve" ? getDevBuildId() : ""),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
