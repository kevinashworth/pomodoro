import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, describe, expect, test, vi } from "vitest";

type TauriWindow = Window & { isTauri?: boolean };

describe("env gating", () => {
  afterEach(() => {
    clearMocks();
    delete (window as TauriWindow).isTauri;
    vi.resetModules();
  });

  test("reports the web build in a browser", async () => {
    const { IS_WEB } = await import("@/constants/env");

    expect(IS_WEB).toBe(true);
  });

  test("reports the native build under Tauri", async () => {
    mockIPC(() => {});
    (window as TauriWindow).isTauri = true;

    const { IS_WEB } = await import("@/constants/env");

    expect(IS_WEB).toBe(false);
  });
});
