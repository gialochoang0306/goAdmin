import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  api,
  ApiError,
  configureAuth,
  mapConcurrent,
  normalize,
  request,
} from "../lib/api";
import {
  cancellableStatuses,
  date,
  money,
  pricingError,
  safeImage,
} from "../lib/format";
import { ok, fail } from "./fixtures";

describe("API authentication and contracts", () => {
  const token = vi.fn(async (refresh?: boolean) =>
    refresh ? "fresh-token" : "initial-token",
  );
  const expire = vi.fn();
  beforeEach(() => {
    token.mockClear();
    expire.mockClear();
    configureAuth(token, expire);
  });
  it("refreshes a read once after 401 and uses the fresh Firebase token", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(fail(401, "Hết phiên"))
      .mockResolvedValueOnce(ok({ id: 1 }));
    vi.stubGlobal("fetch", fetcher);
    expect(await request("/api/auth/me")).toEqual({ id: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(token.mock.calls).toEqual([[false], [true]]);
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer fresh-token",
    );
    expect(expire).not.toHaveBeenCalled();
  });
  it("never retries a write and expires a rejected session", async () => {
    const fetcher = vi.fn().mockResolvedValue(fail(401, "Hết phiên"));
    vi.stubGlobal("fetch", fetcher);
    await expect(api.cancel(11, "Khách yêu cầu")).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(expire).toHaveBeenCalledTimes(1);
  });
  it("stops after the second read rejection and does not sign out on business 403", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(async () => fail(401, "Hết phiên"));
    vi.stubGlobal("fetch", fetcher);
    await expect(api.me()).rejects.toThrow("Hết phiên");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(expire).toHaveBeenCalledTimes(1);
    expire.mockClear();
    fetcher.mockImplementation(async () =>
      fail(403, "Không được thao tác", "FORBIDDEN"),
    );
    await expect(api.offline(41)).rejects.toThrow("Không được thao tác");
    expect(expire).not.toHaveBeenCalled();
  });
  it("preserves false, zero, null and maps nested backend snake_case DTOs", () => {
    expect(
      normalize({
        driver: { full_name: "An", credit_balance: 0, flagged: false },
        documents: [{ secure_url: null, is_current: true }],
      }),
    ).toEqual({
      driver: { fullName: "An", creditBalance: 0, flagged: false },
      documents: [{ secureUrl: null, isCurrent: true }],
    });
    expect(money(0)).not.toBe("—");
    expect(money(null)).toBe("—");
  });
  it("sends the expected write DTOs and explicit force flag", async () => {
    const fetcher = vi.fn().mockImplementation(async () => ok({}));
    vi.stubGlobal("fetch", fetcher);
    await api.assign(11, 41);
    expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body)).toEqual({
      driver_id: 41,
    });
    await api.review(51, "REJECTED", "Ảnh mờ");
    expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body)).toEqual({
      status: "REJECTED",
      rejection_reason: "Ảnh mờ",
    });
    await api.customerStatus(21, "BANNED", "Vi phạm");
    expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body)).toEqual({
      status: "BANNED",
      reason: "Vi phạm",
    });
    const values = {
      vehicleType: "CAR",
      active: true,
      baseFare: 1,
      perKm: 2,
      perMinuteWaiting: 0,
      minFare: 1,
      nightSurchargePercent: 0,
      nightStart: null,
      nightEnd: null,
      returnFeeForDriver: 0,
    };
    await api.savePricing(values);
    expect(JSON.parse(fetcher.mock.calls.at(-1)![1].body)).toMatchObject({
      vehicle_type: "CAR",
      active: true,
    });
    await api.savePricing(values, 71);
    const body = JSON.parse(fetcher.mock.calls.at(-1)![1].body);
    expect(body).not.toHaveProperty("vehicle_type");
    expect(body).not.toHaveProperty("active");
    await api.deactivate(71);
    expect(fetcher.mock.calls.at(-1)![0]).toContain("force=false");
    await api.deactivate(71, true);
    expect(fetcher.mock.calls.at(-1)![0]).toContain("force=true");
  });
  it("handles network and malformed responses with user-facing errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(api.rides()).rejects.toThrow("Không kết nối");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html/>")));
    await expect(api.rides()).rejects.toThrow("dữ liệu không hợp lệ");
  });
});
it("caps concurrent profile requests at four and preserves nearby ordering", async () => {
  let pending = 0;
  let max = 0;
  const result = await mapConcurrent(
    Array.from({ length: 20 }, (_, i) => i),
    async (i) => {
      pending++;
      max = Math.max(max, pending);
      await new Promise((resolve) => setTimeout(resolve, 1));
      pending--;
      return i * 2;
    },
  );
  expect(max).toBe(4);
  expect(result).toEqual(Array.from({ length: 20 }, (_, i) => i * 2));
});
it("validates night pricing and exact cancellation boundaries", () => {
  expect(pricingError({ nightSurchargePercent: 10 })).toContain("cần giờ");
  expect(
    pricingError({ nightSurchargePercent: 0, nightStart: "22:00" }),
  ).toContain("đi cùng nhau");
  expect(
    pricingError({
      nightSurchargePercent: 10,
      nightStart: "22:00",
      nightEnd: "22:00",
    }),
  ).toContain("khác nhau");
  expect(
    pricingError({
      nightSurchargePercent: 20,
      nightStart: "22:00",
      nightEnd: "06:00",
    }),
  ).toBeNull();
  expect(cancellableStatuses.has("IN_PROGRESS")).toBe(false);
  expect(cancellableStatuses.has("VEHICLE_HANDOVER")).toBe(true);
  expect(safeImage("javascript:alert(1)")).toBeUndefined();
  expect(date("2026-10-24")).toBe("24/10/2026");
  expect(date("2026-10-24T03:00:00Z")).toContain("10:00");
});
