import { afterEach, describe, expect, test, vi } from "vitest";

import { installNotificationMock } from "@/test/mocks";
import { notifyPhaseEnd, SHORT_LABELS, TITLE } from "@/utils/notifications";

/* Re testing strings: Use the imported constants to pin down the behavior of
the function: return a constant - whatever its value is, the function should
behave the same way. But use a literal if the constant must never change. */

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("notifyPhaseEnd", () => {
  test("notifies with the break text for a break phase", async () => {
    const notifications = installNotificationMock("granted");

    await notifyPhaseEnd("break");

    expect(SHORT_LABELS.break).toMatch(/work/i);
    expect(notifications.constructor).toHaveBeenCalledWith(TITLE, {
      body: `${SHORT_LABELS.break}`,
      silent: true,
    });
  });

  test("notifies with the work text for a work phase", async () => {
    const notifications = installNotificationMock("granted");

    await notifyPhaseEnd("work");

    expect(SHORT_LABELS.work).toMatch(/break/i);
    expect(notifications.constructor).toHaveBeenCalledWith(TITLE, {
      body: `${SHORT_LABELS.work}`,
      silent: true,
    });
  });

  test("does not notify when permission is not granted", async () => {
    const notifications = installNotificationMock("denied");

    await notifyPhaseEnd("break");

    expect(notifications.constructor).not.toHaveBeenCalled();
  });

  test("requests default permission before notifying", async () => {
    const notifications = installNotificationMock("default");

    await notifyPhaseEnd("break");

    expect(notifications.requestPermission).toHaveBeenCalledOnce();
    expect(notifications.permission).toBe("granted");
    expect(notifications.constructor).toHaveBeenCalledOnce();
  });

  test("does not throw when the Notification API is unavailable", async () => {
    vi.stubGlobal("Notification", undefined);
    Reflect.deleteProperty(window, "Notification");

    await expect(notifyPhaseEnd("break")).resolves.toBeUndefined();
  });
});
