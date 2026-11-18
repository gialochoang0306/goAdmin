import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { AdminApp } from "../App";
import { Status } from "../components/common";
import { configureAuth } from "../lib/api";
import { activeStatuses, date, label, money, rideLabels } from "../lib/format";
import { DashboardFinance } from "../pages/DashboardFinance";
import type { DashboardSummary } from "../types";
import {
  customer as customerFixture,
  driver as driverFixture,
  ok,
  page,
  profile,
  ride as rideFixture,
} from "./fixtures";

vi.mock("../auth", () => ({
  useAuth: () => ({
    profile,
    loading: false,
    configError: null,
    sessionError: null,
    logout: vi.fn(),
  }),
}));

function renderPage(path: string) {
  const router = createMemoryRouter([{ path: "*", element: <AdminApp /> }], { initialEntries: [path] });
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  const view = render(
    <ConfigProvider locale={viVN} theme={{ token: { motion: false } }}>
      <AntApp>
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }), ...view };
}

let voucherPostCalls = 0;
let resolveBudgetPut: (() => void) | undefined;

beforeEach(() => {
  voucherPostCalls = 0;
  resolveBudgetPut = undefined;
  configureAuth(async () => "fake-token", () => {});
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const u = new URL(url, "http://localhost");
      const method = init?.method ?? "GET";

      if (u.pathname === "/api/admin/rides") return ok(page([rideFixture]));
      if (u.pathname === "/api/admin/rides/11") {
        return ok({ ...rideFixture, id: 11, status: "FAILED_SYSTEM" });
      }
      if (u.pathname === "/api/admin/rides/11/handover") return ok([]);
      if (u.pathname === "/api/admin/rides/11/chat") return ok(page([]));
      if (u.pathname === "/api/admin/ratings") {
        return ok(
          page([
            {
              id: 101,
              rideId: 11,
              direction: "CUSTOMER_TO_DRIVER",
              raterId: 21,
              raterName: "Khách A",
              rateeId: 41,
              rateeName: "Tài xế B",
              stars: 4,
              comment: "Rất tốt",
              tags: ["Đúng giờ"],
              tip: 0,
              createdAt: "2026-11-18T10:00:00Z",
              hidden: false,
              hiddenAt: null,
              hiddenBy: null,
              hiddenReason: null,
            },
          ]),
        );
      }

      if (u.pathname === "/api/admin/drivers") return ok(page([driverFixture]));
      if (u.pathname === "/api/admin/drivers/41") return ok({ ...driverFixture, documents: [], capabilities: [] });
      if (u.pathname === "/api/admin/customers") return ok(page([customerFixture]));
      if (u.pathname === "/api/admin/customers/21") return ok({ ...customerFixture, vehicles: [] });

      if (u.pathname === "/api/admin/tickets") {
        return ok(
          page([
            {
              id: 77,
              code: "HT-77",
              category: "PAYMENT",
              status: "OPEN",
              ownerRole: "CUSTOMER",
              ownerId: 21,
              ownerName: "Khách A",
              ownerPhoneNumber: "0912345678",
              rideId: 11,
              createdAt: "2026-11-18T07:00:00Z",
              updatedAt: "2026-11-18T08:00:00Z",
            },
          ]),
        );
      }
      if (u.pathname === "/api/admin/tickets/77") {
        return ok({
          ticket: {
            id: 77,
            code: "HT-77",
            category: "PAYMENT",
            status: "IN_PROGRESS",
            ownerRole: "CUSTOMER",
            ownerId: 21,
            ownerName: "Khách A",
            ownerPhoneNumber: "0912345678",
            rideId: 11,
            createdAt: "2026-11-18T07:00:00Z",
            updatedAt: "2026-11-18T08:00:00Z",
          },
          description: "Kiểm tra thanh toán",
          images: [],
          messages: [],
        });
      }
      if (u.pathname === "/api/admin/tickets/77/claim" && method === "POST") {
        return ok({
          ticket: {
            id: 77,
            code: "HT-77",
            category: "PAYMENT",
            status: "IN_PROGRESS",
            ownerRole: "CUSTOMER",
            ownerId: 21,
            ownerName: "Khách A",
            ownerPhoneNumber: "0912345678",
            rideId: 11,
            createdAt: "2026-11-18T07:00:00Z",
            updatedAt: "2026-11-18T08:00:00Z",
          },
          description: "Kiểm tra thanh toán",
          images: [],
          messages: [],
        });
      }

      if (u.pathname === "/api/admin/vouchers/budget") {
        if (method === "PUT") {
          voucherPostCalls += 1;
          return new Promise<Response>((resolve) => {
            resolveBudgetPut = () =>
              resolve(
                ok({
                  budgetLimit: 12_000_000,
                  heldAmount: 0,
                  spentAmount: 0,
                  issuanceReserved: 0,
                  availableAmount: 12_000_000,
                }),
              );
          });
        }
        return ok({
          budgetLimit: 10_000_000,
          heldAmount: 200_000,
          spentAmount: 800_000,
          issuanceReserved: 500_000,
          availableAmount: 8_500_000,
        });
      }
      if (u.pathname === "/api/admin/vouchers/1/claims") return ok([]);
      if (u.pathname === "/api/admin/vouchers") {
        return ok([
          {
            id: 1,
            code: "TET2026",
            campaignTitle: "Ưu đãi Tết",
            source: "PUBLIC_CODE",
            active: true,
            ownerCustomerId: null,
            discountType: "PERCENT",
            value: 20,
            maxDiscount: 50_000,
            minimumOrderAmount: 100_000,
            usageLimit: 100,
            validFrom: "2026-01-01T00:00:00Z",
            validTo: "2099-12-31T23:59:59Z",
            allowedPaymentMethod: null,
            description: "Giảm 20%",
            campaignClaimCount: 10,
            campaignUsedCount: 5,
            campaignHeldCount: 1,
            campaignBudgetLimit: 2_000_000,
            campaignHeldAmount: 50_000,
            campaignSpentAmount: 250_000,
            campaignReleasedAmount: 0,
            systemReserveAmount: null,
          },
        ]);
      }

      if (u.pathname === "/api/admin/dashboard/summary") {
        return ok({
          tripCount: 10,
          previousTripCount: 5,
          gmv: 1_000_000,
          revenue: 200_000,
          promoCost: 300_000,
          grossProfit: -100_000,
          paymentMix: { cash: 0, wallet: 0, other: 0 },
          daily: [],
          wallets: { driverCash: 0, customer: 0, driverCredit: 0, pendingWithdrawals: 0 },
          anomalies: [],
        } satisfies DashboardSummary);
      }
      if (u.pathname === "/api/admin/driver-documents") return ok(page([]));
      if (u.pathname === "/api/admin/withdrawals") return ok(page([]));
      if (u.pathname === "/api/admin/pricing-rules") return ok(page([]));

      return ok({});
    }),
  );
});

describe("GoAdmin UI/UX regressions", () => {
  it("supports FAILED_SYSTEM ride status label, badge, and excludes it from activeStatuses", () => {
    expect(rideLabels.FAILED_SYSTEM).toBe("Lỗi hệ thống");
    expect(label("PAYMENT")).toBe("Thanh toán");
    expect(activeStatuses.split(",")).not.toContain("FAILED_SYSTEM");

    render(
      <ConfigProvider locale={viVN}>
        <Status value="FAILED_SYSTEM" />
      </ConfigProvider>,
    );
    expect(screen.getByText("Lỗi hệ thống")).toBeVisible();
  });

  it("renders a structured 404 Result page with home CTA on unknown routes", async () => {
    renderPage("/not-a-valid-admin-route");
    expect(await screen.findByText("Không tìm thấy trang")).toBeVisible();
    const link = screen.getByRole("link", { name: "Về trang tổng quan" });
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders topbar breadcrumbs for detail and verification subroutes and distinct pricing icon", async () => {
    const { container } = renderPage("/drivers/41");
    const nav = await screen.findByRole("navigation", { name: "Đường dẫn hiện tại" });
    expect(nav).toHaveTextContent("Tài xế");
    expect(nav).toHaveTextContent("#41");
    expect(container.querySelector('.ant-menu-item .anticon-tags')).toBeInTheDocument();
  });

  it("renders negative gross profit styling and chart empty state when daily series is empty", async () => {
    const summary: DashboardSummary = {
      tripCount: 10,
      previousTripCount: 5,
      gmv: 1_000_000,
      revenue: 200_000,
      promoCost: 300_000,
      grossProfit: -100_000,
      paymentMix: { cash: 0, wallet: 0, other: 0 },
      daily: [],
      wallets: { driverCash: 0, customer: 0, driverCredit: 0, pendingWithdrawals: 0 },
      anomalies: [],
    };

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { container } = render(
      <ConfigProvider locale={viVN}>
        <QueryClientProvider client={client}>
          <DashboardFinance
            query={{ data: summary, isPending: false, isFetching: false, error: null, refetch: vi.fn() } as never}
            period={7}
            onPeriodChange={vi.fn()}
          />
        </QueryClientProvider>
      </ConfigProvider>,
    );

    const negativeCard = container.querySelector('.dashboard-metric[data-tone="negative"]');
    expect(negativeCard).toBeInTheDocument();
    expect(negativeCard).toHaveTextContent(money(-100_000).replace(/\u00a0/g, " "));
    expect(screen.getAllByText("Chưa có chuyến hoàn thành trong kỳ.").length).toBeGreaterThanOrEqual(2);
  });

  it("formats Voucher amounts and dates with shared formatters and blocks duplicate budget submits while pending", async () => {
    const { user } = renderPage("/vouchers");
    expect(await screen.findByText(/tối đa 50\.000/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Chi tiết/ }));
    expect(
      await screen.findByText(new RegExp(date("2026-01-01T00:00:00Z").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))),
    ).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Đóng" }).at(-1)!);

    const saveBtn = screen.getByRole("button", { name: "Lưu tổng quỹ" });
    await user.click(saveBtn);
    await waitFor(() => expect(voucherPostCalls).toBe(1));
    await user.click(saveBtn);
    expect(voucherPostCalls).toBe(1);
    resolveBudgetPut?.();
    await waitFor(() => expect(saveBtn).not.toHaveClass("ant-btn-loading"));
  });

  it("renders Tickets DataTable reset control and accessible reply composer labels", async () => {
    const { user } = renderPage("/tickets");
    expect(await screen.findByRole("link", { name: "HT-77" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Xóa bộ lọc" })).toBeVisible();

    await user.click(screen.getByRole("link", { name: "HT-77" }));
    expect(await screen.findByText("Trạng thái sau phản hồi")).toBeVisible();
    expect(screen.getByRole("combobox", { name: "Cập nhật trạng thái ticket" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nội dung phản hồi")).toBeVisible();
  });

  it("renders RideRatings with tonal rating-item containers and accessible hide-rating dialog", async () => {
    const { user, container } = renderPage("/rides/11");
    await user.click(await screen.findByRole("tab", { name: /Đánh giá/ }));
    expect(await screen.findByText("Rất tốt")).toBeVisible();
    expect(container.querySelector(".rating-item")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ẩn đánh giá" }));
    const reasonBox = await screen.findByRole("textbox", { name: /Lý do ẩn đánh giá/ });
    expect(reasonBox).toHaveAttribute("id", "hide-rating-reason");
  });
});

