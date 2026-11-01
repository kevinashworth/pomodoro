import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { resetSoundMock } from "@/test/sound-mock";

vi.mock("howler", async () => {
  const { FakeHowl, HowlerStub } = await import("@/test/sound-mock");
  return { Howl: FakeHowl, Howler: HowlerStub };
});

// jsdom does not implement the native <dialog> modal methods.
if (typeof HTMLDialogElement !== "undefined") {
  HTMLDialogElement.prototype.showModal ??= function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function close(this: HTMLDialogElement) {
    this.open = false;
  };
}

afterEach(() => {
  cleanup();
  resetSoundMock();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.localStorage.clear();
});
