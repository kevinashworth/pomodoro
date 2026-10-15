import { vi } from "vitest";

export type NotificationMock = {
  permission: NotificationPermission;
  requestPermission: ReturnType<typeof vi.fn>;
  constructor: ReturnType<typeof vi.fn>;
  instances: Array<{ title: string; options?: NotificationOptions }>;
};

export function installNotificationMock(permission: NotificationPermission = "granted"): NotificationMock {
  const instances: Array<{ title: string; options?: NotificationOptions }> = [];
  let permissionState = permission;
  const requestPermission = vi.fn(async (): Promise<NotificationPermission> => {
    if (permissionState === "default") {
      permissionState = "granted";
    }
    return permissionState;
  });
  const constructor = vi.fn(function MockNotification(this: unknown, title: string, options?: NotificationOptions) {
    instances.push({ title, options });
  });

  Object.defineProperty(constructor, "permission", {
    configurable: true,
    get: () => permissionState,
    set: (value: NotificationPermission) => {
      permissionState = value;
    },
  });
  Object.assign(constructor, { requestPermission });

  vi.stubGlobal("Notification", constructor);
  const mock: NotificationMock = {
    get permission() {
      return permissionState;
    },
    set permission(value: NotificationPermission) {
      permissionState = value;
    },
    requestPermission,
    constructor,
    instances,
  };
  return mock;
}
