import { renderHook } from "@testing-library/react";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { afterEach, describe, expect, test } from "vitest";

import { useTrayTitle } from "@/hooks/use-tray-title";

type TauriWindow = Window & { isTauri?: boolean };

const TOMATO = "🍅";

afterEach(() => {
  clearMocks();
  delete (window as TauriWindow).isTauri;
});

function mockTrayInvoke() {
  const titles: string[] = [];
  mockIPC((cmd, payload) => {
    if (cmd === "set_tray_title") {
      titles.push((payload as { title: string }).title);
    }
  });
  (window as TauriWindow).isTauri = true;
  return titles;
}

function renderTrayTitle(initialProps: { enabled: boolean; remainingSeconds: number }) {
  return renderHook(({ enabled, remainingSeconds }) => useTrayTitle(enabled, remainingSeconds), {
    initialProps,
  });
}

describe("useTrayTitle", () => {
  test("sets the clock title when enabled", async () => {
    const titles = mockTrayInvoke();

    renderTrayTitle({ enabled: true, remainingSeconds: 90 });

    await expect.poll(() => titles).toEqual([`01:30  ${TOMATO}`]);
  });

  test("sets only the tomato when disabled", async () => {
    const titles = mockTrayInvoke();

    renderTrayTitle({ enabled: false, remainingSeconds: 90 });

    await expect.poll(() => titles).toEqual([TOMATO]);
  });

  test("does not re-invoke while disabled as the clock ticks", async () => {
    const titles = mockTrayInvoke();

    const { rerender } = renderTrayTitle({ enabled: false, remainingSeconds: 90 });
    await expect.poll(() => titles).toHaveLength(1);

    rerender({ enabled: false, remainingSeconds: 89 });
    rerender({ enabled: false, remainingSeconds: 88 });

    expect(titles).toEqual([TOMATO]);
  });

  test("updates the title once per tick while enabled", async () => {
    const titles = mockTrayInvoke();

    const { rerender } = renderTrayTitle({ enabled: true, remainingSeconds: 90 });
    await expect.poll(() => titles).toHaveLength(1);

    rerender({ enabled: true, remainingSeconds: 89 });

    await expect.poll(() => titles).toEqual([`01:30  ${TOMATO}`, `01:29  ${TOMATO}`]);
  });

  test("does not invoke outside Tauri", async () => {
    const titles: string[] = [];
    mockIPC((cmd) => {
      titles.push(cmd);
    });

    renderTrayTitle({ enabled: true, remainingSeconds: 90 });

    expect(titles).toEqual([]);
  });
});
