import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, describe, expect, test, vi } from "vitest";

type TauriWindow = Window & { isTauri?: boolean };

describe("env gating", () => {
  afterEach(() => {
    clearMocks();
    delete (window as TauriWindow).isTauri;
    vi.resetModules();
  });

  test("enables the playground in a browser during dev", async () => {
    const { IS_PLAYGROUND_ENABLED, IS_WEB } = await import("@/constants/env");

    expect(IS_WEB).toBe(true);
    expect(IS_PLAYGROUND_ENABLED).toBe(true);
  });

  test("disables the playground under Tauri", async () => {
    mockIPC(() => {});
    (window as TauriWindow).isTauri = true;

    const { IS_PLAYGROUND_ENABLED, IS_WEB } = await import("@/constants/env");

    expect(IS_WEB).toBe(false);
    expect(IS_PLAYGROUND_ENABLED).toBe(false);
  });
});
