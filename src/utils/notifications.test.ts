import { afterEach, describe, expect, test, vi } from "vitest";

import { installNotificationMock } from "@/test/mocks";
import notifyPhaseEnd from "@/utils/notifications";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("notifyPhaseEnd", () => {
  test("notifies with the break label for a break phase", () => {
    const notifications = installNotificationMock("granted");

    notifyPhaseEnd("break");

    expect(notifications.constructor).toHaveBeenCalledWith("Pomodoro: Break ready", {
      body: "Open the timer to start the next phase.",
      silent: true,
    });
  });

  test("notifies with the work label for a work phase", () => {
    const notifications = installNotificationMock("granted");

    notifyPhaseEnd("work");

    expect(notifications.instances[0]?.title).toContain("Work ready");
  });

  test("does not notify when permission is not granted", () => {
    const notifications = installNotificationMock("denied");

    notifyPhaseEnd("break");

    expect(notifications.constructor).not.toHaveBeenCalled();
  });

  test("does not throw when the Notification API is unavailable", () => {
    vi.stubGlobal("Notification", undefined);
    Reflect.deleteProperty(window, "Notification");

    expect(() => notifyPhaseEnd("break")).not.toThrow();
  });
});
