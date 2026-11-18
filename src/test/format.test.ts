import { afterEach, expect, it, vi } from "vitest";
import { percentage, rideDateRange } from "../lib/format";

afterEach(() => vi.useRealTimers());

it("shows fractional rates as percentages, preserving zero and distinguishing missing data", () => {
  expect(percentage(0.25)).toBe("25%");
  expect(percentage(0)).toBe("0%");
  expect(percentage(1)).toBe("100%");
  expect(percentage(null)).toBe("Chưa có dữ liệu");
});

it("turns Vietnam calendar dates into a half-open UTC window and rejects invalid dates", () => {
  expect(rideDateRange("2026-11-05", "2026-11-05")).toEqual({ createdFrom: "2026-11-04T17:00:00.000Z", createdTo: "2026-11-05T17:00:00.000Z" });
  expect(rideDateRange("2026-02-30", "").error).toBeTruthy();
  expect(rideDateRange("2026-11-06", "2026-11-05").error).toBeTruthy();
});

it("rejects future creation dates at either bound and uses the Vietnam calendar day", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-15T16:59:59Z"));
  expect(rideDateRange("3123-03-12", "").error).toBeTruthy();
  expect(rideDateRange("", "2026-11-16").error).toBeTruthy();
  expect(rideDateRange("2026-11-15", "2026-11-15")).toEqual({ createdFrom: "2026-11-14T17:00:00.000Z", createdTo: "2026-11-15T17:00:00.000Z" });
  vi.setSystemTime(new Date("2026-11-15T17:00:00Z"));
  expect(rideDateRange("2026-11-16", "2026-11-16").error).toBeUndefined();
});
