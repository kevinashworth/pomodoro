import { defineConfig, mergeConfig } from "vitest/config";
import type { ConfigEnv } from "vite";
import viteConfig from "./vite.config.mts";

// vite.config.mts exports a function so it can distinguish `vite` from
// `vite build`; Vitest's mergeConfig only accepts the resolved object.
const configEnv: ConfigEnv = {
  command: "serve",
  mode: "test",
  isSsrBuild: false,
  isPreview: false,
};

export default mergeConfig(
  typeof viteConfig === "function" ? viteConfig(configEnv) : viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      pool: "vmThreads",
      setupFiles: "./tests/setup.ts",
      include: ["src/**/*.test.{ts,tsx}", "src/**/*.spec.{ts,tsx}"],
    },
  }),
);
