import { vi } from "vitest";

export type NotificationMock = {
  permission: NotificationPermission;
  constructor: ReturnType<typeof vi.fn>;
  instances: Array<{ title: string; options?: NotificationOptions }>;
};

export function installNotificationMock(permission: NotificationPermission = "granted"): NotificationMock {
  const instances: Array<{ title: string; options?: NotificationOptions }> = [];
  const constructor = vi.fn(function MockNotification(this: unknown, title: string, options?: NotificationOptions) {
    instances.push({ title, options });
  });

  const mock: NotificationMock = {
    permission,
    constructor,
    instances,
  };

  vi.stubGlobal("Notification", Object.assign(constructor, mock));
  return mock;
}
