import { expect, test, type Page } from "@playwright/test";
import { POMODORO_STORAGE_KEY } from "@/constants/pomodoro";

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

async function setMinutes(
  page: Page,
  work: string,
  brk: string,
): Promise<void> {
  await openSettings(page);
  await page.getByTestId("work-minutes-input").fill(work);
  await page.getByTestId("break-minutes-input").fill(brk);
  await page.goto("/");
}

async function parseTimeInSeconds(page: Page): Promise<number> {
  const text = (await getTimeDisplay(page).innerText()).trim();
  const match = text.match(/^(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error(`Unexpected timer text: ${text}`);
  }
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

async function dragKnobToRemaining(page: Page, targetSeconds: number) {
  const svg = page
    .locator('svg[role="img"][aria-label^="Time remaining "]')
    .first();
  const knob = page.getByTestId("drag-knob");

  const svgBox = await svg.boundingBox();
  const knobBox = await knob.boundingBox();

  if (!svgBox || !knobBox) {
    throw new Error("Missing geometry for drag interaction");
  }

  const remainingFraction = Math.max(0, Math.min(1, targetSeconds / 60));
  const elapsedFraction = 1 - remainingFraction;
  const angle = -elapsedFraction * 2 * Math.PI - Math.PI / 2;

  const centerX = svgBox.x + svgBox.width / 2;
  const centerY = svgBox.y + svgBox.height / 2;
  const radius = (svgBox.width - 6) / 2;

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
  }, POMODORO_STORAGE_KEY);
  await page.reload();

  await expect(getModeLabel(page)).toHaveText(/work/i);
  await expect(getTimeDisplay(page)).toHaveText("20:00");
});

test("default state and settings defaults", async ({ page }) => {
  await expect(getCenterControl(page)).toHaveAttribute(
    "aria-label",
    "Start timer",
  );
  await expect(getCompletedCount(page)).toHaveText("Completed today: 0");

  await getSettingsOpenButton(page).click();
  await expect(page.getByTestId("sound-toggle")).toBeChecked();
  await expect(page.getByTestId("notifications-toggle")).not.toBeChecked();
  await expect(page.getByTestId("mini-mode-toggle")).not.toBeChecked();
});

test("start, pause, resume, and keyboard shortcuts", async ({ page }) => {
  await getCenterControl(page).click();
  await expect(getCenterControl(page)).toHaveAttribute(
    "aria-label",
    "Pause timer",
  );

  await getCenterControl(page).click();
  await expect(getCenterControl(page)).toHaveAttribute(
    "aria-label",
    "Resume timer",
  );

  await page.mouse.click(2, 2);
  const beforeSpace = await getCenterControl(page).getAttribute("aria-label");
  await page.keyboard.press("Space");
  const afterFirstSpace =
    await getCenterControl(page).getAttribute("aria-label");
  expect(afterFirstSpace).not.toBe(beforeSpace);

  await page.keyboard.press("Space");
  const afterSecondSpace =
    await getCenterControl(page).getAttribute("aria-label");
  expect(afterSecondSpace).toBe(beforeSpace);

  await getSettingsOpenButton(page).click();
  await expect(page).toHaveURL(/\/settings$/);
});

test("dragging updates time while paused and while running", async ({
  page,
}) => {
  await setMinutes(page, "1", "1");

  await dragKnobToRemaining(page, 40);
  let time = await parseTimeInSeconds(page);
  expect(time).toBeGreaterThanOrEqual(35);
  expect(time).toBeLessThanOrEqual(45);

  await getCenterControl(page).click();
  await dragKnobToRemaining(page, 20);
  time = await parseTimeInSeconds(page);
  expect(time).toBeGreaterThanOrEqual(15);
  expect(time).toBeLessThanOrEqual(25);
  await expect(getCenterControl(page)).toHaveAttribute(
    "aria-label",
    "Pause timer",
  );
});

test("skip flow requires confirmation and preserves transition semantics", async ({
  page,
}) => {
  const modeBeforeCancel = (await getModeLabel(page).innerText()).toLowerCase();
  const completedBeforeCancel = await getCompletedCount(page).innerText();

  await getSkipButton(page).click();
  await expect(page.getByTestId("skip-confirm-dialog")).toBeVisible();
  await page.getByTestId("skip-confirm-cancel").click();

  await expect(getModeLabel(page)).toHaveText(
    new RegExp(modeBeforeCancel, "i"),
  );
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

test("natural phase completion and reload restore behavior", async ({
  page,
}) => {
  await setMinutes(page, "1", "1");

  await dragKnobToRemaining(page, 1);
  await getCenterControl(page).click();
  await page.waitForTimeout(1500);

  await expect(getModeLabel(page)).toHaveText(/break/i);
  await expect(getCenterControl(page)).toHaveAttribute(
    "aria-label",
    "Start timer",
  );

  await dragKnobToRemaining(page, 1);
  await getCenterControl(page).click();
  await page.waitForTimeout(1500);

  await expect(getModeLabel(page)).toHaveText(/work/i);
  await expect(getCenterControl(page)).toHaveAttribute(
    "aria-label",
    "Start timer",
  );

  await dragKnobToRemaining(page, 25);
  await getCenterControl(page).click();
  await page.waitForTimeout(1000);
  const beforeReload = await parseTimeInSeconds(page);

  await page.reload();
  await page.waitForTimeout(1000);
  const afterReload = await parseTimeInSeconds(page);

  await expect(getCenterControl(page)).toHaveAttribute(
    "aria-label",
    "Pause timer",
  );
  expect(afterReload).toBeLessThanOrEqual(beforeReload);
});

test("settings clamp values to supported minute bounds", async ({ page }) => {
  await openSettings(page);
  await page.getByTestId("work-minutes-input").fill("0");
  await page.getByTestId("break-minutes-input").fill("61");
  await expect(page.getByTestId("work-minutes-input")).toHaveValue("1");
  await expect(page.getByTestId("break-minutes-input")).toHaveValue("60");

  await page.goto("/");
  await openSettings(page);
  await expect(page.getByTestId("work-minutes-input")).toHaveValue("1");
  await expect(page.getByTestId("break-minutes-input")).toHaveValue("60");
});

test("daily reset clears stale completed day key", async ({ page }) => {
  await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return;

    const parsed = JSON.parse(raw) as {
      completedToday: number;
      completedDayKey: string;
    };

    parsed.completedToday = 9;
    parsed.completedDayKey = "1999-01-01";
    window.localStorage.setItem(key, JSON.stringify(parsed));
  }, POMODORO_STORAGE_KEY);

  await page.reload();
  await expect(getCompletedCount(page)).toHaveText("Completed today: 0");
});

test("mini mode hides secondary UI and expand button restores it", async ({
  page,
}) => {
  await openSettings(page);
  await page.getByTestId("mini-mode-toggle").check();
  await page.goto("/");

  await expect(page.getByTestId("expand-button")).toBeVisible();
  await expect(getModeLabel(page)).toBeHidden();
  await expect(getSkipButton(page)).toBeHidden();
  await expect(getCompletedCount(page)).toBeHidden();

  await page.getByTestId("expand-button").click();
  await expect(getModeLabel(page)).toBeVisible();
  await expect(getSkipButton(page)).toBeVisible();
  await expect(getCompletedCount(page)).toBeVisible();
  await expect(page.getByTestId("expand-button")).toBeHidden();
});

test("Cmd+, navigates to settings", async ({ page }) => {
  await page.keyboard.press("Meta+,");
  await expect(page).toHaveURL(/\/settings$/);
});

test("Cmd+Shift+M toggles mini mode", async ({ page }) => {
  await openSettings(page);
  const firstState = await page.getByTestId("mini-mode-toggle").isChecked();
  await page.keyboard.press("Meta+Shift+M");
  const toggled = await page.getByTestId("mini-mode-toggle").isChecked();
  expect(toggled).not.toBe(firstState);
  await page.keyboard.press("Meta+Shift+M");
  const restored = await page.getByTestId("mini-mode-toggle").isChecked();
  expect(restored).toBe(firstState);
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
