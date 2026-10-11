import { act, fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { DEFAULT_DAILY_RESET_HOUR, DEFAULT_WORK_MINUTES } from "@/constants/pomodoro";
import { installNotificationMock } from "@/test/mocks";
import {
  clearTimerStorage,
  readTimerStateStorage,
  renderTimer,
  renderTimerWithSettingsControls,
  seedRawTimerStateStorage,
  seedTimerStateStorage,
  type RenderTimerOptions,
  type RenderTimerSeedOptions,
} from "@/test/render-timer";
import { getDayId } from "@/utils/time";

const TEST_NOW = new Date("2026-03-01T12:00:00");

function currentDayId(resetHour = DEFAULT_DAILY_RESET_HOUR): string {
  return getDayId(new Date(), resetHour);
}

function timeDisplay(): HTMLElement {
  return screen.getByTestId("time-display");
}

function modeLabel(): HTMLElement {
  return screen.getByTestId("mode-label");
}

function completedCount(): HTMLElement {
  return screen.getByTestId("completed-count");
}

function dragKnob(): HTMLElement {
  return screen.getByTestId("drag-knob");
}

function actionButton(): HTMLElement {
  return screen.getByTestId("action-button");
}

function ringProgress(): HTMLElement {
  return screen.getByTestId("ring-progress");
}

function strokeDashoffset(): number {
  return parseFloat(ringProgress().getAttribute("stroke-dashoffset") || "0");
}

function svg(): HTMLElement {
  return screen.getByRole("group", { name: /time remaining/i });
}

async function renderAndHydrate(options: RenderTimerOptions = {}, seedOptions: RenderTimerSeedOptions = {}) {
  const result = renderTimer(options, seedOptions);
  // The restore effect defers state via requestAnimationFrame; under fake timers
  // that frame is scheduled on the mocked clock, so advance the clock to run it.
  await act(async () => {
    vi.advanceTimersToNextFrame();
  });
  return result;
}

async function renderAndHydrateWithControls(
  options: RenderTimerOptions = {},
  seedOptions: RenderTimerSeedOptions = {},
) {
  const result = renderTimerWithSettingsControls(options, seedOptions);
  await act(async () => {
    vi.advanceTimersToNextFrame();
  });
  return result;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TEST_NOW);
  clearTimerStorage();
});

describe("countdown", () => {
  test("ticks down one second at a time while running", async () => {
    await renderAndHydrate();

    expect(timeDisplay()).toHaveTextContent("25:00");
    fireEvent.click(actionButton());

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(timeDisplay()).toHaveTextContent("24:57");
    expect(actionButton()).toHaveTextContent("Pause");
  });

  test("does not tick while paused", async () => {
    await renderAndHydrate();

    fireEvent.click(actionButton());
    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(actionButton());

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(timeDisplay()).toHaveTextContent("24:58");
    expect(actionButton()).toHaveTextContent("Resume");
  });

  test("advances to break when work reaches zero and resets to break duration", async () => {
    await renderAndHydrate({
      settings: { workMinutes: 1, breakMinutes: 2 },
      timerState: { remainingSeconds: 0 },
    });

    fireEvent.click(actionButton());
    await act(async () => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(modeLabel()).toHaveTextContent(/break/i);
    expect(timeDisplay()).toHaveTextContent("02:00");
    expect(actionButton()).toHaveTextContent("Start");
    expect(completedCount()).toHaveTextContent("Completed today: 1");
  });

  test("never renders a negative clock after crossing zero", async () => {
    await renderAndHydrate({
      settings: { workMinutes: 1, breakMinutes: 1 },
      timerState: { remainingSeconds: 0 },
    });

    fireEvent.click(actionButton());
    await act(async () => {
      vi.advanceTimersByTime(65 * 1000);
    });

    // The completed work phase transitions to an idle break at its full duration.
    expect(timeDisplay()).toHaveTextContent("01:00");
    expect(timeDisplay().textContent).not.toContain("-");
  });

  test("clears the countdown interval on unmount", async () => {
    const { unmount } = await renderAndHydrate();

    fireEvent.click(actionButton());
    const before = timeDisplay().textContent;
    unmount();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // The timer is gone, so nothing re-renders; just assert it stopped cleanly.
    expect(before).toBe("25:00");
    expect(screen.queryByTestId("time-display")).toBeNull();
  });

  test("fresh start with no persisted state uses the configured work minutes", async () => {
    await renderAndHydrate({ settings: { workMinutes: 1, breakMinutes: 2 } }, { seed: false });

    expect(timeDisplay()).toHaveTextContent("01:00");
  });
});

describe("phase transitions", () => {
  test("break completion does not increment the completed count", async () => {
    await renderAndHydrate({
      settings: { workMinutes: 1, breakMinutes: 1 },
      timerState: {
        mode: "break",
        status: "running",
        remainingSeconds: 1,
        sessionsCompletedToday: 4,
      },
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(modeLabel()).toHaveTextContent(/work/i);
    expect(completedCount()).toHaveTextContent("Completed today: 4");
  });

  test("skip on work increments the count and switches to break", async () => {
    await renderAndHydrate({
      timerState: {
        mode: "work",
        status: "running",
        remainingSeconds: 10 * 60, // 10 minutes, less than half of the default 25-minute work remains
        sessionsCompletedToday: 0,
      },
    });

    // pause
    fireEvent.click(screen.getByTestId("action-button"));
    // skip
    fireEvent.click(screen.getByTestId("cancel-button"));

    expect(modeLabel()).toHaveTextContent(/break/i);
    expect(completedCount()).toHaveTextContent("Completed today: 1");
    expect(actionButton()).toHaveTextContent("Start");
  });

  test("skip on break does not increment the count and switches to work", async () => {
    await renderAndHydrate({
      timerState: {
        mode: "break",
        status: "paused",
        remainingSeconds: 2 * 60, // 2 minutes, less than half of the default 5-minute break remains
        sessionsCompletedToday: 2,
      },
    });

    // skip
    fireEvent.click(screen.getByTestId("cancel-button"));

    expect(modeLabel()).toHaveTextContent(/work/i);
    expect(completedCount()).toHaveTextContent("Completed today: 2");
  });
});

describe("restore", () => {
  test("hydrates from empty storage with defaults", async () => {
    await renderAndHydrate({}, { seed: false });

    expect(modeLabel()).toHaveTextContent(/work/i);
    expect(timeDisplay()).toHaveTextContent(`${String(DEFAULT_WORK_MINUTES).padStart(2, "0")}:00`);
    expect(completedCount()).toHaveTextContent("Completed today: 0");
  });

  test("recovers from corrupt JSON without throwing", async () => {
    seedRawTimerStateStorage("{not json");
    await renderAndHydrate({}, { seed: false });

    expect(modeLabel()).toHaveTextContent(/work/i);
    expect(completedCount()).toHaveTextContent("Completed today: 0");
  });

  test("restores a persisted paused state", async () => {
    await renderAndHydrate({
      timerState: { status: "paused", remainingSeconds: 120, sessionsCompletedToday: 3 },
    });

    expect(timeDisplay()).toHaveTextContent("02:00");
    expect(completedCount()).toHaveTextContent("Completed today: 3");
    expect(actionButton()).toHaveTextContent("Resume");
  });

  test("clamps an out-of-range remaining value to the phase max", async () => {
    await renderAndHydrate({
      settings: { workMinutes: 5 },
      timerState: { status: "paused", remainingSeconds: 99999 },
    });

    expect(timeDisplay()).toHaveTextContent("05:00");
  });

  test("elapsed time is deducted from a running state", async () => {
    const now = Date.now();
    await renderAndHydrate({
      timerState: {
        status: "running",
        remainingSeconds: 600,
        updatedAt: now - 60 * 1000,
      },
    });

    expect(timeDisplay()).toHaveTextContent("09:00");
    expect(actionButton()).toHaveTextContent("Pause");
  });

  test("a running state past zero advances and increments a completed work phase", async () => {
    const now = Date.now();
    await renderAndHydrate({
      settings: { workMinutes: 1, breakMinutes: 1 },
      timerState: {
        status: "running",
        remainingSeconds: 10,
        sessionsCompletedToday: 2,
        updatedAt: now - 60 * 1000,
      },
    });

    expect(modeLabel()).toHaveTextContent(/break/i);
    expect(timeDisplay()).toHaveTextContent("01:00");
    expect(completedCount()).toHaveTextContent("Completed today: 3");
  });

  test("a stale day id resets the completed count", async () => {
    await renderAndHydrate({
      timerState: {
        remainingSeconds: 600,
        sessionsCompletedToday: 9,
        sessionsCompletedDayId: "1999-01-01",
      },
    });

    expect(completedCount()).toHaveTextContent("Completed today: 0");
  });

  test("an invalid status falls back to idle", async () => {
    await renderAndHydrate({
      timerState: { status: "bogus" as never, remainingSeconds: 60 },
    });

    expect(actionButton()).toHaveTextContent("Start");
    expect(timeDisplay()).toHaveTextContent("01:00");
  });
});

describe("persistence", () => {
  test("writes a snapshot after hydration", async () => {
    await renderAndHydrate();

    const snapshot = readTimerStateStorage();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.mode).toBe("work");
    expect(snapshot?.status).toBe("idle");
    expect(snapshot?.sessionsCompletedDayId).toBe(currentDayId());
  });

  test("reflects running state changes in storage", async () => {
    await renderAndHydrate();

    await act(async () => {
      fireEvent.click(actionButton());
    });

    expect(readTimerStateStorage()?.status).toBe("running");
  });
});

describe("daily rollover", () => {
  test("resets the count when the pomodoro day changes", async () => {
    vi.setSystemTime(new Date("2026-03-01T23:00:00"));

    await renderAndHydrate({
      timerState: { remainingSeconds: 600, sessionsCompletedToday: 5 },
    });

    expect(completedCount()).toHaveTextContent("Completed today: 5");

    const crossingTime = new Date("2026-03-02T04:00:00").getTime();
    await act(async () => {
      vi.setSystemTime(crossingTime);
      vi.advanceTimersByTime(30000);
    });

    expect(completedCount()).toHaveTextContent("Completed today: 0");
  });

  test("persist syncs the UI count to the aligned snapshot when the day rolls over", async () => {
    // Start on 2026-03-01 with a count of 5, then move the clock into the next
    // pomodoro day. Any state change persists an already-aligned snapshot; the
    // UI must follow it right away instead of waiting for the 30s rollover poll.
    await renderAndHydrate({
      timerState: { remainingSeconds: 1500, sessionsCompletedToday: 5 },
    });

    expect(completedCount()).toHaveTextContent("Completed today: 5");

    await act(async () => {
      vi.setSystemTime(new Date("2026-03-02T13:00:00"));
    });

    // Toggle running (does not touch the count) to force a persist before the poll.
    await act(async () => {
      fireEvent.click(actionButton());
    });

    expect(readTimerStateStorage()?.sessionsCompletedDayId).toBe(currentDayId());
    expect(readTimerStateStorage()?.sessionsCompletedToday).toBe(0);
    expect(completedCount()).toHaveTextContent("Completed today: 0");
  });
});

describe("keyboard", () => {
  test("Space toggles between running, paused", async () => {
    await renderAndHydrate();

    fireEvent.keyDown(window, { code: "Space" });
    expect(actionButton()).toHaveTextContent("Pause");

    fireEvent.keyDown(window, { code: "Space" });
    expect(actionButton()).toHaveTextContent("Resume");
  });

  test("Space from an idle timer at zero resets to the phase max before starting", async () => {
    await renderAndHydrate({
      settings: { workMinutes: 5 },
      timerState: { remainingSeconds: 0 },
    });

    expect(timeDisplay()).toHaveTextContent("00:00");

    fireEvent.keyDown(window, { code: "Space" });

    expect(timeDisplay()).toHaveTextContent("05:00");
    expect(actionButton()).toHaveTextContent("Pause");
  });

  test("Space is ignored while a form control is focused", async () => {
    await renderAndHydrate();

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { code: "Space" });

    expect(actionButton()).toHaveTextContent("Start");
    input.remove();
  });
});

describe("drag", () => {
  const ringSize = 212;
  const center = ringSize / 2;
  const radius = (ringSize - 5) / 2;

  function stubPointerCapture(element: Element) {
    Object.assign(element, {
      setPointerCapture: vi.fn(),
      releasePointerCapture: vi.fn(),
    });
  }

  function stubSvgRect() {
    const svg = screen.getByRole("group", { name: /time remaining/i });
    vi.spyOn(svg, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: ringSize,
      height: ringSize,
      right: ringSize,
      bottom: ringSize,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    return svg;
  }

  test("pointer drag updates the remaining time while paused", async () => {
    await renderAndHydrate({
      settings: { workMinutes: 10, breakMinutes: 5 },
      timerState: { status: "paused", remainingSeconds: 600 },
    });

    const knob = dragKnob();
    const circumference = 2 * Math.PI * radius;
    stubSvgRect();
    stubPointerCapture(knob);

    // Bottom of the ring is 50% remaining (10-minute phase → 05:00).
    fireEvent.pointerDown(knob, { clientX: center, clientY: center + radius, pointerId: 1 });
    expect(timeDisplay()).toHaveTextContent("05:00");
    const expectedOffset = circumference / 2;
    const actualOffset = strokeDashoffset();
    expect(Math.abs(actualOffset - expectedOffset)).toBeLessThan(1);

    // Move to left side of ring: 75% remaining (10-minute phase → 07:30).
    fireEvent.pointerMove(knob, { clientX: center - radius, clientY: center, pointerId: 1 });
    expect(timeDisplay()).toHaveTextContent("07:30");
    const expectedOffset2 = circumference / 4;
    const actualOffset2 = strokeDashoffset();
    expect(Math.abs(actualOffset2 - expectedOffset2)).toBeLessThan(1);

    fireEvent.pointerUp(knob, { clientX: center, clientY: center + radius, pointerId: 1 });
  });

  test("slider exposes and changes the remaining time from the keyboard", async () => {
    await renderAndHydrate({
      settings: { workMinutes: 10, breakMinutes: 5 },
      timerState: { status: "paused", remainingSeconds: 600 },
    });

    const slider = screen.getByRole("slider", { name: "Adjust time remaining" });
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "600");
    expect(slider).toHaveAttribute("aria-valuenow", "600");
    expect(slider).toHaveAttribute("aria-valuetext", "10:00");

    fireEvent.keyDown(slider, { key: "ArrowLeft" });

    expect(timeDisplay()).toHaveTextContent("09:54");
    expect(slider).toHaveAttribute("aria-valuenow", "594");
  });

  test("drag clamps to at least one second while running", async () => {
    await renderAndHydrate({
      settings: { workMinutes: 10, breakMinutes: 5 },
      timerState: { status: "running", remainingSeconds: 600 },
    });

    const knob = dragKnob();
    stubSvgRect();
    stubPointerCapture(knob);

    // A point just clockwise of the top yields ~0 remaining, which must clamp to 1s while running.
    const nearTopClockwise = { clientX: center + 1, clientY: center - radius };
    fireEvent.pointerDown(knob, { ...nearTopClockwise, pointerId: 1 });
    expect(timeDisplay()).toHaveTextContent("00:01");

    fireEvent.pointerUp(knob, { ...nearTopClockwise, pointerId: 1 });
  });
});

describe("sounds and notifications", () => {
  test("fires a notification on phase end when enabled", async () => {
    const notifications = installNotificationMock("granted");
    await renderAndHydrate({
      settings: { notificationsEnabled: true, soundEnabled: false, workMinutes: 1, breakMinutes: 1 },
      timerState: { status: "running", remainingSeconds: 1 },
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(notifications.constructor).toHaveBeenCalled();
    expect(notifications.instances[0]?.title).toContain("Break ready");
  });

  test("does not notify when disabled", async () => {
    const notifications = installNotificationMock("granted");
    await renderAndHydrate({
      settings: { soundEnabled: false, workMinutes: 1, breakMinutes: 1 },
      timerState: { status: "running", remainingSeconds: 1 },
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(notifications.constructor).not.toHaveBeenCalled();
  });

  test("does not notify when permission is not granted", async () => {
    const notifications = installNotificationMock("denied");
    await renderAndHydrate({
      settings: { notificationsEnabled: true, soundEnabled: false, workMinutes: 1, breakMinutes: 1 },
      timerState: { status: "running", remainingSeconds: 1 },
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(notifications.constructor).not.toHaveBeenCalled();
  });

  test("does not throw when the Notification API is unavailable", async () => {
    vi.stubGlobal("Notification", undefined);
    Reflect.deleteProperty(window, "Notification");
    await renderAndHydrate({
      settings: { notificationsEnabled: true, soundEnabled: false, workMinutes: 1, breakMinutes: 1 },
      timerState: { status: "running", remainingSeconds: 1 },
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(modeLabel()).toHaveTextContent(/break/i);
  });
});

describe("strict mode", () => {
  test("a completed work phase increments the count exactly once", async () => {
    // StrictMode double-invokes state updaters in development; the phase
    // transition must be idempotent so the count never double-increments.
    await renderAndHydrate({
      strict: true,
      timerState: { status: "running", remainingSeconds: 1 },
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(modeLabel()).toHaveTextContent(/break/i);
    expect(completedCount()).toHaveTextContent("Completed today: 1");
  });
});

describe("ring rendering", () => {
  test("uses the orange color while running in work mode", async () => {
    await renderAndHydrate({ timerState: { mode: "work", status: "running", remainingSeconds: 30 } });

    expect(actionButton()).toHaveClass(/bg-orange-500/);
    expect(svg()).toHaveClass(/stroke-orange-500/);
  });

  test("uses the orange color while running in break mode", async () => {
    await renderAndHydrate({ timerState: { mode: "break", status: "running", remainingSeconds: 30 } });

    expect(actionButton()).toHaveClass(/bg-orange-500/);
    expect(svg()).toHaveClass(/stroke-orange-500/);
  });

  test("uses the green color while idle", async () => {
    await renderAndHydrate({ timerState: { mode: "work", status: "idle", remainingSeconds: 30 } });

    expect(actionButton()).toHaveClass(/bg-green-500/);
    expect(svg()).toHaveClass(/stroke-green-500/);
  });

  test("uses the green color while paused", async () => {
    await renderAndHydrate({ timerState: { mode: "work", status: "paused", remainingSeconds: 30 } });

    expect(actionButton()).toHaveClass(/bg-green-500/);
    expect(svg()).toHaveClass(/stroke-green-500/);
  });

  test("moves the ring between whole-second clock updates", async () => {
    await renderAndHydrate();

    const initialOffset = strokeDashoffset();
    fireEvent.click(screen.getByTestId("action-button"));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(timeDisplay()).toHaveTextContent("25:00");
    expect(strokeDashoffset()).not.toBe(initialOffset);
  });

  test("freezes ring progress while paused and resumes smoothly", async () => {
    await renderAndHydrate();

    fireEvent.click(screen.getByTestId("action-button"));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    const pausedOffset = strokeDashoffset();
    fireEvent.click(screen.getByTestId("action-button"));

    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(strokeDashoffset()).toBe(pausedOffset);
    fireEvent.click(screen.getByTestId("action-button"));

    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(strokeDashoffset()).not.toBe(pausedOffset);
  });
});

describe("settings changes mid-session", () => {
  test("clamps the remaining time when work minutes shrink mid-session", async () => {
    const { controls } = await renderAndHydrateWithControls({
      timerState: { remainingSeconds: 1500 },
    });

    await act(async () => {
      controls.setWorkMinutes(10);
    });

    expect(timeDisplay()).toHaveTextContent("10:00");
  });

  test("clamps the remaining time when break minutes shrink mid-session", async () => {
    const { controls } = await renderAndHydrateWithControls({
      timerState: { mode: "break", remainingSeconds: 300, sessionsCompletedToday: 1 },
    });

    await act(async () => {
      controls.setBreakMinutes(2);
    });

    expect(timeDisplay()).toHaveTextContent("02:00");
  });

  test("does not rescale the remaining time upward when the phase duration grows", async () => {
    const { controls } = await renderAndHydrateWithControls({
      timerState: { status: "paused", remainingSeconds: 900, sessionsCompletedToday: 3 },
    });

    await act(async () => {
      controls.setWorkMinutes(30);
    });

    expect(timeDisplay()).toHaveTextContent("15:00");
  });

  test("does not re-run restore when settings change mid-session", async () => {
    const { controls } = await renderAndHydrateWithControls({
      timerState: { status: "paused", remainingSeconds: 900, sessionsCompletedToday: 3 },
    });

    expect(timeDisplay()).toHaveTextContent("15:00");

    // Overwrite storage with a divergent snapshot after hydration; if the
    // restore effect re-ran on a settings change, the live timer would snap
    // to these stale values.
    seedTimerStateStorage({
      mode: "break",
      status: "idle",
      remainingSeconds: 30,
      sessionsCompletedToday: 99,
      sessionsCompletedDayId: currentDayId(),
      dailyResetHour: DEFAULT_DAILY_RESET_HOUR,
      updatedAt: Date.now(),
    });

    // Changing break minutes does not affect the current work phase max, so
    // only a restore re-run could touch the live state.
    await act(async () => {
      controls.setBreakMinutes(2);
    });
    await act(async () => {
      vi.advanceTimersToNextFrame();
    });

    expect(timeDisplay()).toHaveTextContent("15:00");
    expect(modeLabel()).toHaveTextContent(/work/i);
    expect(completedCount()).toHaveTextContent("Completed today: 3");
  });
});
