import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, describe, expect, test } from "vitest";

import { clearTimerStorage, renderTimer } from "@/test/render-timer";

type TauriWindow = Window & { isTauri?: boolean };

type Invocation = { cmd: string; payload: unknown };

function primaryActionButton(): HTMLElement {
  return screen.getByTestId("primary-action-button");
}

function mockTauriCommands(): Invocation[] {
  const calls: Invocation[] = [];
  mockIPC((cmd, payload) => {
    calls.push({ cmd, payload });
  });
  (window as TauriWindow).isTauri = true;
  return calls;
}

afterEach(async () => {
  // Unmount while the Tauri event internals are still registered, then let the
  // async `listen` cleanup settle before tearing the mocks down.
  cleanup();
  await new Promise((resolve) => setTimeout(resolve, 0));
  clearMocks();
  delete (window as TauriWindow).isTauri;
  clearTimerStorage();
});

describe("native scheduler wiring", () => {
  test("schedules the native alarm when running and cancels it when paused", async () => {
    const calls = mockTauriCommands();

    renderTimer();

    fireEvent.click(primaryActionButton());

    await waitFor(() => expect(calls.some((c) => c.cmd === "schedule_timer")).toBe(true));
    const scheduled = calls.find((c) => c.cmd === "schedule_timer");
    expect(scheduled?.payload).toMatchObject({ showInMenuBar: false });
    expect(typeof (scheduled?.payload as { endAtMs: number }).endAtMs).toBe("number");

    fireEvent.click(primaryActionButton());

    await waitFor(() => expect(calls.some((c) => c.cmd === "cancel_timer")).toBe(true));
  });

  test("does not schedule the native alarm outside Tauri", async () => {
    const calls: Invocation[] = [];
    mockIPC((cmd, payload) => {
      calls.push({ cmd, payload });
    });

    renderTimer();

    fireEvent.click(primaryActionButton());

    expect(calls.some((c) => c.cmd === "schedule_timer")).toBe(false);
  });
});
