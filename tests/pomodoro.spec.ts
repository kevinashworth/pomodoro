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

function getModeLabel(page: Page) {
  return page.getByTestId("mode-label");
}

function getTimeDisplay(page: Page) {
  return page.getByTestId("time-display");
}

function getCenterControl(page: Page) {
  return page.getByTestId("center-control");
}

function getSkipButton(page: Page) {
  return page.getByTestId("skip-button");
}

function getSettingsOpenButton(page: Page) {
  return page.getByTestId("settings-open-button");
}

function getCompletedCount(page: Page) {
  return page.getByTestId("completed-count");
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
  const text = (await getTimeDisplay(page).textContent() ?? "");
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Unexpected timer text: ${text}`);
  }
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

async function dragKnobToRemaining(page: Page, targetSeconds: number, phaseSeconds: number) {
  const svg = page.locator('svg[role="img"][aria-label^="Time remaining "]').first();
  const knob = page.getByTestId("drag-knob");

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
  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Start timer");
  await expect(getCompletedCount(page)).toHaveText("Completed today: 0");

  await getSettingsOpenButton(page).click();
  await expect(page.getByTestId("work-minutes-input")).toHaveValue(String(DEFAULT_WORK_MINUTES));
  await expect(page.getByTestId("break-minutes-input")).toHaveValue(String(DEFAULT_BREAK_MINUTES));
  await expect(page.getByTestId("sound-toggle")).toBeChecked();
  await expect(page.getByTestId("notifications-toggle")).not.toBeChecked();
});

test("start, pause, resume, and keyboard shortcuts", async ({ page }) => {
  await getCenterControl(page).click();
  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Pause timer");

  await getCenterControl(page).click();
  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Resume timer");

  await page.mouse.click(2, 2);
  const beforeSpace = await getCenterControl(page).getAttribute("aria-label");
  await page.keyboard.press("Space");
  const afterFirstSpace = await getCenterControl(page).getAttribute("aria-label");
  expect(afterFirstSpace).not.toBe(beforeSpace);

  await page.keyboard.press("Space");
  const afterSecondSpace = await getCenterControl(page).getAttribute("aria-label");
  expect(afterSecondSpace).toBe(beforeSpace);

  await getSettingsOpenButton(page).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("dragging updates time while paused and while running", async ({ page }) => {
  await setMinutes(page, ONE_MINUTE, ONE_MINUTE);

  await dragKnobToRemaining(page, 40, ONE_MINUTE_PHASE_SECONDS);
  let time = await parseTimeInSeconds(page);
  expect(time).toBeGreaterThanOrEqual(35);
  expect(time).toBeLessThanOrEqual(45);

  await getCenterControl(page).click();
  await dragKnobToRemaining(page, 20, ONE_MINUTE_PHASE_SECONDS);
  time = await parseTimeInSeconds(page);
  expect(time).toBeGreaterThanOrEqual(15);
  expect(time).toBeLessThanOrEqual(25);
  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Pause timer");
});

test("skip flow requires confirmation and preserves transition semantics", async ({ page }) => {
  const modeBeforeCancel = (await getModeLabel(page).innerText()).toLowerCase();
  const completedBeforeCancel = await getCompletedCount(page).innerText();

  await getSkipButton(page).click();
  await expect(page.getByTestId("skip-confirm-dialog")).toBeVisible();
  await page.getByTestId("skip-confirm-cancel").click();

  await expect(getModeLabel(page)).toHaveText(new RegExp(modeBeforeCancel, "i"));
  await expect(getCompletedCount(page)).toHaveText(completedBeforeCancel);

  const beforeWorkSkip = await getCompletedCount(page).innerText();
  await getSkipButton(page).click();
  await page.getByTestId("skip-confirm-confirm").click();

  await expect(getModeLabel(page)).toHaveText(/break/i);
  const afterWorkSkip = await getCompletedCount(page).innerText();

  const beforeCount = Number((beforeWorkSkip.match(/(\d+)/) ?? ["0"])[0]);
  const afterCount = Number((afterWorkSkip.match(/(\d+)/) ?? ["0"])[0]);
  expect(afterCount).toBe(beforeCount + 1);

  const beforeBreakSkip = await getCompletedCount(page).innerText();
  await getSkipButton(page).click();
  await page.getByTestId("skip-confirm-confirm").click();

  await expect(getModeLabel(page)).toHaveText(/work/i);
  await expect(getCompletedCount(page)).toHaveText(beforeBreakSkip);
});

test("natural phase completion and reload restore behavior", async ({ page }) => {
  await setMinutes(page, ONE_MINUTE, ONE_MINUTE);

  await dragKnobToRemaining(page, 1, ONE_MINUTE_PHASE_SECONDS);
  await getCenterControl(page).click();
  await page.waitForTimeout(1500);

  await expect(getModeLabel(page)).toHaveText(/break/i);
  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Start timer");

  await dragKnobToRemaining(page, 1, ONE_MINUTE_PHASE_SECONDS);
  await getCenterControl(page).click();
  await page.waitForTimeout(1500);

  await expect(getModeLabel(page)).toHaveText(/work/i);
  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Start timer");

  await dragKnobToRemaining(page, 25, ONE_MINUTE_PHASE_SECONDS);
  await getCenterControl(page).click();
  await page.waitForTimeout(1000);
  const beforeReload = await parseTimeInSeconds(page);

  await page.reload();
  await page.waitForTimeout(1000);
  const afterReload = await parseTimeInSeconds(page);

  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Pause timer");
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

test("daily reset clears stale completed day key", async ({ page }) => {
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
  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Start timer");

  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "focus-probe";
    document.body.appendChild(input);
    input.focus();
  });

  await page.keyboard.press("Space");

  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Start timer");
});

test("live daily rollover clears the completed count", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-03-01T23:00:00") });
  await page.goto("/");
  await page.evaluate((key) => {
    window.localStorage.removeItem(key);
  }, TIMER_STATE_STORAGE_KEY);
  await page.reload();

  await getSkipButton(page).click();
  await page.getByTestId("skip-confirm-confirm").click();
  await expect(getCompletedCount(page)).toHaveText("Completed today: 1");

  await page.clock.fastForward("04:30:00");

  await expect(getCompletedCount(page)).toHaveText("Completed today: 0");
});

test("changing work minutes mid-session resets the running phase", async ({ page }) => {
  await setMinutes(page, "25", "5");
  await expect(getTimeDisplay(page)).toHaveText("25:00");

  await getCenterControl(page).click();
  await expect(getCenterControl(page)).toHaveAttribute("aria-label", "Pause timer");

  await openSettings(page);
  await page.getByTestId("work-minutes-input").fill("10");
  await page.goto("/");

  // Characterizes the current (buggy) behavior: the change re-runs restore and
  // resets the timer to the configured phase length.
  await expect(getTimeDisplay(page)).toHaveText("10:00");
});
