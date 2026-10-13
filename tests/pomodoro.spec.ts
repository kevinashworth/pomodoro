import { expect, test, type Page } from "@playwright/test";
import {
  DEFAULT_BREAK_MINUTES,
  DEFAULT_WORK_MINUTES,
  MAX_MINUTES,
  MIN_MINUTES,
  STROKE_WIDTH,
  TIMER_STATE_STORAGE_KEY,
} from "@/constants/pomodoro";

const STALE_COMPLETED_COUNT = 9;
const STALE_DAY_ID = "1999-01-01";
const ONE_MINUTE = String(MIN_MINUTES);
const ONE_MINUTE_PHASE_SECONDS = MIN_MINUTES * 60;

function formatMinutes(minutes: number): string {
  return `${String(minutes).padStart(2, "0")}:00`;
}

function getTimeDisplay(page: Page) {
  return page.getByTestId("time-display");
}

function getModeLabel(page: Page) {
  return page.getByTestId("mode-label");
}

function getCompletedCount(page: Page) {
  return page.getByTestId("completed-count");
}

function getDragKnob(page: Page) {
  return page.getByTestId("drag-knob");
}

function getPrimaryActionButton(page: Page) {
  return page.getByTestId("primary-action-button");
}

function getSettingsOpenButton(page: Page) {
  return page.getByTestId("settings-open-button");
}

async function openSettings(page: Page): Promise<void> {
  await page.goto("/settings");
}

async function setMinutes(page: Page, work: string, brk: string): Promise<void> {
  await openSettings(page);
  await page.getByTestId("work-minutes-input").fill(work);
  await page.getByTestId("break-minutes-input").fill(brk);
  await page.goto("/");
}

async function parseTimeInSeconds(page: Page): Promise<number> {
  const text = (await getTimeDisplay(page).textContent()) ?? "";
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Unexpected timer text: ${text}`);
  }
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

async function dragKnobToRemaining(page: Page, targetSeconds: number, phaseSeconds: number) {
  const svg = page.locator('svg[role="group"][aria-label^="Time remaining "]').first();
  const knob = getDragKnob(page);

  const svgBox = await svg.boundingBox();
  const knobBox = await knob.boundingBox();

  if (!svgBox || !knobBox) {
    throw new Error("Missing geometry for drag interaction");
  }

  const remainingFraction = Math.max(0, Math.min(1, targetSeconds / phaseSeconds));
  const elapsedFraction = 1 - remainingFraction;
  const angle = -elapsedFraction * 2 * Math.PI - Math.PI / 2;

  const centerX = svgBox.x + svgBox.width / 2;
  const centerY = svgBox.y + svgBox.height / 2;
  const radius = (svgBox.width - STROKE_WIDTH) / 2;

  const targetX = centerX + radius * Math.cos(angle);
  const targetY = centerY + radius * Math.sin(angle);

  const fromX = knobBox.x + knobBox.width / 2;
  const fromY = knobBox.y + knobBox.height / 2;

  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 16 });
  await page.mouse.up();

  await page.waitForTimeout(150);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, TIMER_STATE_STORAGE_KEY);
  await page.reload();

  await expect(getModeLabel(page)).toHaveText(/work/i);
  await expect(getTimeDisplay(page)).toHaveText(formatMinutes(DEFAULT_WORK_MINUTES));
});

test("default state and settings defaults", async ({ page }) => {
  await expect(getPrimaryActionButton(page)).toHaveText("Start");
  await expect(getCompletedCount(page)).toHaveText("Completed today: 0");

  await getSettingsOpenButton(page).click();
  await expect(page.getByTestId("work-minutes-input")).toHaveValue(String(DEFAULT_WORK_MINUTES));
  await expect(page.getByTestId("break-minutes-input")).toHaveValue(String(DEFAULT_BREAK_MINUTES));
  await expect(page.getByTestId("sound-toggle")).toBeChecked();
  await expect(page.getByTestId("notifications-toggle")).not.toBeChecked();
});

test("start, pause, resume, and keyboard shortcuts", async ({ page }) => {
  await getPrimaryActionButton(page).click();
  await expect(getPrimaryActionButton(page)).toHaveText("Pause");

  await getPrimaryActionButton(page).click();
  await expect(getPrimaryActionButton(page)).toHaveText("Resume");

  await page.mouse.click(2, 2);
  const beforeSpace = await getPrimaryActionButton(page).textContent();
  await page.keyboard.press("Space");
  const afterFirstSpace = await getPrimaryActionButton(page).textContent();
  expect(afterFirstSpace).not.toBe(beforeSpace);
  await page.keyboard.press("Space");
  const afterSecondSpace = await getPrimaryActionButton(page).textContent();
  expect(afterSecondSpace).toBe(beforeSpace);

  await getSettingsOpenButton(page).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("dragging updates time while running and while paused", async ({ page }) => {
  await setMinutes(page, ONE_MINUTE, ONE_MINUTE);

  await expect(getPrimaryActionButton(page)).toHaveText("Start");
  await getPrimaryActionButton(page).click();
  await dragKnobToRemaining(page, 40, ONE_MINUTE_PHASE_SECONDS);
  let time = await parseTimeInSeconds(page);
  expect(time).toBeGreaterThanOrEqual(35);
  expect(time).toBeLessThanOrEqual(45);

  await expect(getPrimaryActionButton(page)).toHaveText("Pause");
  await getPrimaryActionButton(page).click();
  await expect(getPrimaryActionButton(page)).toHaveText("Resume");
  await getPrimaryActionButton(page).click();
  await dragKnobToRemaining(page, 20, ONE_MINUTE_PHASE_SECONDS);
  time = await parseTimeInSeconds(page);
  expect(time).toBeGreaterThanOrEqual(15);
  expect(time).toBeLessThanOrEqual(25);
  await expect(getPrimaryActionButton(page)).toHaveText("Pause");
});

test("ring progress moves smoothly through pause and resume", async ({ page }) => {
  await setMinutes(page, ONE_MINUTE, ONE_MINUTE);

  const ring = page.getByTestId("ring-progress");
  const circumference = Number(await ring.getAttribute("stroke-dasharray"));
  const oneSecondOfArc = circumference / ONE_MINUTE_PHASE_SECONDS;

  const sampleRing = (windowMs: number) =>
    page.evaluate(
      (duration) =>
        new Promise<{ offset: number; clock: string; timestamp: number }[]>((resolve, reject) => {
          const ringProgress = document.querySelector<SVGCircleElement>('[data-testid="ring-progress"]');
          const timeDisplay = document.querySelector<SVGTextElement>('[data-testid="time-display"]');

          if (!ringProgress || !timeDisplay) {
            reject(new Error("Timer ring or clock display is missing"));
            return;
          }

          const samples: { offset: number; clock: string; timestamp: number }[] = [];
          const startedAt = performance.now();

          const sample = (timestamp: number) => {
            samples.push({
              offset: Number(ringProgress.getAttribute("stroke-dashoffset")),
              clock: timeDisplay.textContent ?? "",
              timestamp,
            });

            if (timestamp - startedAt >= duration) {
              resolve(samples);
            } else {
              requestAnimationFrame(sample);
            }
          };

          requestAnimationFrame(sample);
        }),
      windowMs,
    );

  const sampleUntilClockChanges = (startingClock: string) =>
    page.evaluate(
      (initialClock) =>
        new Promise<{ offset: number; clock: string; timestamp: number }[]>((resolve, reject) => {
          const ringProgress = document.querySelector<SVGCircleElement>('[data-testid="ring-progress"]');
          const timeDisplay = document.querySelector<SVGTextElement>('[data-testid="time-display"]');

          if (!ringProgress || !timeDisplay) {
            reject(new Error("Timer ring or clock display is missing"));
            return;
          }

          const samples: { offset: number; clock: string; timestamp: number }[] = [];
          let frameId = 0;
          const timeoutId = window.setTimeout(() => {
            window.cancelAnimationFrame(frameId);
            reject(new Error("Timer clock did not advance while sampling ring progress"));
          }, 2500);

          const sample = (timestamp: number) => {
            const clock = timeDisplay.textContent ?? "";
            samples.push({
              offset: Number(ringProgress.getAttribute("stroke-dashoffset")),
              clock,
              timestamp,
            });

            if (clock !== initialClock) {
              window.clearTimeout(timeoutId);
              resolve(samples);
              return;
            }

            frameId = window.requestAnimationFrame(sample);
          };

          frameId = window.requestAnimationFrame(sample);
        }),
      startingClock,
    );

  await getPrimaryActionButton(page).click();
  const running = await sampleRing(300);

  expect(new Set(running.map(({ offset }: { offset: number }) => offset)).size).toBeGreaterThan(2);
  expect(new Set(running.map(({ clock }) => clock)).size).toBe(1);

  const runningSteps = running.slice(1).map((sample, index) => sample.offset - running[index].offset);
  expect(runningSteps.every((step) => step >= 0)).toBe(true);
  expect(Math.max(...runningSteps)).toBeLessThan(oneSecondOfArc);

  await getPrimaryActionButton(page).click();
  const paused = await sampleRing(250);
  const frozenOffset = paused.at(-1)!.offset;

  expect(new Set(paused.map(({ offset }) => offset)).size).toBe(1);

  await getPrimaryActionButton(page).click();
  const resumed = await sampleRing(300);

  expect(Math.abs(resumed[0].offset - frozenOffset)).toBeLessThan(oneSecondOfArc);
  const resumedSteps = resumed.slice(1).map((sample, index) => sample.offset - resumed[index].offset);
  expect(resumedSteps.every((step) => step >= 0)).toBe(true);

  const throughNextTick = await sampleUntilClockChanges(resumed.at(-1)!.clock);
  expect(new Set(throughNextTick.map(({ clock }) => clock)).size).toBeGreaterThan(1);
  const tickSteps = throughNextTick.slice(1).map((sample, index) => sample.offset - throughNextTick[index].offset);
  expect(tickSteps.every((step) => step >= 0)).toBe(true);
  const resumedDuration = (throughNextTick.at(-1)!.timestamp - resumed[0].timestamp) / 1000;
  const expectedProgress = (circumference * resumedDuration) / ONE_MINUTE_PHASE_SECONDS;
  const actualProgress = throughNextTick.at(-1)!.offset - resumed[0].offset;
  expect(actualProgress).toBeGreaterThan(expectedProgress * 0.8);

  const afterTick = await sampleRing(200);
  expect(new Set(afterTick.map(({ offset }) => offset)).size).toBeGreaterThan(2);
  const afterTickSteps = afterTick.slice(1).map((sample, index) => sample.offset - afterTick[index].offset);
  expect(afterTickSteps.every((step) => step >= 0)).toBe(true);
});

test("natural phase completion and reload restore behavior", async ({ page }) => {
  await setMinutes(page, ONE_MINUTE, ONE_MINUTE);

  await dragKnobToRemaining(page, 1, ONE_MINUTE_PHASE_SECONDS);
  await getPrimaryActionButton(page).click();
  await page.waitForTimeout(1500);

  await expect(getModeLabel(page)).toHaveText(/break/i);
  await expect(getPrimaryActionButton(page)).toHaveText("Start");

  await dragKnobToRemaining(page, 1, ONE_MINUTE_PHASE_SECONDS);
  await getPrimaryActionButton(page).click();
  await page.waitForTimeout(1500);

  await expect(getModeLabel(page)).toHaveText(/work/i);
  await expect(getPrimaryActionButton(page)).toHaveText("Start");

  await dragKnobToRemaining(page, 25, ONE_MINUTE_PHASE_SECONDS);
  await getPrimaryActionButton(page).click();
  await page.waitForTimeout(1000);
  const beforeReload = await parseTimeInSeconds(page);

  await page.reload();
  await page.waitForTimeout(1000);
  const afterReload = await parseTimeInSeconds(page);

  await expect(getPrimaryActionButton(page)).toHaveText("Pause");
  expect(afterReload).toBeLessThanOrEqual(beforeReload);
});

test("settings clamp values to supported minute bounds", async ({ page }) => {
  await openSettings(page);
  await page.getByTestId("work-minutes-input").fill(String(MIN_MINUTES - 1));
  await page.getByTestId("break-minutes-input").fill(String(MAX_MINUTES + 1));
  await expect(page.getByTestId("work-minutes-input")).toHaveValue(String(MIN_MINUTES));
  await expect(page.getByTestId("break-minutes-input")).toHaveValue(String(MAX_MINUTES));

  await page.goto("/");
  await openSettings(page);
  await expect(page.getByTestId("work-minutes-input")).toHaveValue(String(MIN_MINUTES));
  await expect(page.getByTestId("break-minutes-input")).toHaveValue(String(MAX_MINUTES));
});

test("daily reset clears stale completed day key", { lock: "localStorage" }, async ({ page }) => {
  await page.evaluate(
    ({ key, count, dayId }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        sessionsCompletedToday: number;
        sessionsCompletedDayId: string;
      };

      parsed.sessionsCompletedToday = count;
      parsed.sessionsCompletedDayId = dayId;
      window.localStorage.setItem(key, JSON.stringify(parsed));
    },
    { key: TIMER_STATE_STORAGE_KEY, count: STALE_COMPLETED_COUNT, dayId: STALE_DAY_ID },
  );

  await page.reload();
  await expect(getCompletedCount(page)).toHaveText("Completed today: 0");
});

test("Cmd+, navigates to settings", async ({ page }) => {
  await page.keyboard.press("Meta+,");
  await expect(page).toHaveURL(/\/settings$/);
});

test("Escape returns to the timer from settings", async ({ page }) => {
  await openSettings(page);
  await expect(page).toHaveURL(/\/settings$/);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/$/);
});

test("Cmd+1 returns to the timer from settings", async ({ page }) => {
  await openSettings(page);
  await expect(page).toHaveURL(/\/settings$/);
  await page.keyboard.press("Meta+1");
  await expect(page).toHaveURL(/\/$/);
});

test("Space is ignored while a form control is focused", async ({ page }) => {
  await expect(getPrimaryActionButton(page)).toHaveText("Start");

  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "focus-probe";
    document.body.appendChild(input);
    input.focus();
  });

  await page.keyboard.press("Space");

  await expect(getPrimaryActionButton(page)).toHaveText("Start");
});

test("live daily rollover clears the completed count", { lock: "localStorage" }, async ({ page }) => {
  await page.clock.install({ time: new Date("2026-03-01T23:00:00") });
  await page.goto("/");
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, TIMER_STATE_STORAGE_KEY);
  await page.reload();
  await page.waitForFunction((key) => window.localStorage.getItem(key) !== null, TIMER_STATE_STORAGE_KEY);

  await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) throw new Error("Timer snapshot was not initialized");

    const snapshot = JSON.parse(raw) as { sessionsCompletedToday: number };
    snapshot.sessionsCompletedToday = 1;
    window.localStorage.setItem(key, JSON.stringify(snapshot));
  }, TIMER_STATE_STORAGE_KEY);
  await page.reload();
  await expect(getCompletedCount(page)).toHaveText("Completed today: 1");

  await page.clock.fastForward("04:30:00");

  await expect(getCompletedCount(page)).toHaveText("Completed today: 0");
});

test("changing work minutes mid-session resets the running phase", async ({ page }) => {
  await setMinutes(page, "25", "5");
  await expect(getTimeDisplay(page)).toHaveText("25:00");

  await getPrimaryActionButton(page).click();
  await expect(getPrimaryActionButton(page)).toHaveText("Pause");

  await openSettings(page);
  await page.getByTestId("work-minutes-input").fill("10");
  await page.goto("/");

  // Characterizes the current (buggy) behavior: the change re-runs restore and
  // resets the timer to the configured phase length.
  await expect(getTimeDisplay(page)).toHaveText("10:00");
});
