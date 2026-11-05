import { expect, it } from "vitest";
import { returnPath } from "../lib/navigation";

it("preserves valid internal context and rejects external or ambiguous paths", () => {
  expect(returnPath({ from: "/rides/11?tab=chat" }, "/drivers")).toBe("/rides/11?tab=chat");
  for (const from of ["//evil.example", "/\\evil.example", "https://evil.example", "/login", 12, null]) {
    expect(returnPath({ from }, "/drivers")).toBe("/drivers");
  }
});
