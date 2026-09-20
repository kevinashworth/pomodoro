import { expect, test } from "vitest";

test("Vitest runs with a DOM environment", () => {
  expect(document.createElement("button")).toBeInstanceOf(HTMLButtonElement);
});