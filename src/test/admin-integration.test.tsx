import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import viVN from "antd/locale/vi_VN";
import { AdminApp } from "../App";
import { configureAuth } from "../lib/api";
import {
  customer as customerFixture,
  driver as driverFixture,
  ok,
  page,
  profile,
  ride as rideFixture,
} from "./fixtures";
import type { AdminRatingItem, AdminVoucher, BudgetLedgerItem, CampaignClaimant, PromoBudget } from "../types";

vi.mock("../auth", () => ({
  useAuth: () => ({
    profile,
    loading: false,
    configError: null,
    sessionError: null,
    logout: vi.fn(),
  }),
}));

const activeClients: QueryClient[] = [];

afterEach(() => {
  while (activeClients.length) {
    activeClients.pop()?.clear();
  }
});

function renderPage(path: string) {
  const router = createMemoryRouter([{ path: "*", element: <AdminApp /> }], { initialEntries: [path] });
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  activeClients.push(client);
  render(
    <ConfigProvider locale={viVN} theme={{ token: { motion: false } }}>
      <AntApp>
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }) };
}

let ratings: AdminRatingItem[] = [];
let vouchers: AdminVoucher[] = [];
let budget: PromoBudget = {
  budgetLimit: 10_000_000,
  heldAmount: 200_000,
  spentAmount: 800_000,
  issuanceReserved: 500_000,
  availableAmount: 8_500_000,
};
let ledger: BudgetLedgerItem[] = [];
let claimants: CampaignClaimant[] = [];
let writes: { path: string; method: string; body: Record<string, unknown> }[] = [];
let reads: string[] = [];
let nearbyDriversEmpty = false;

beforeEach(() => {
  nearbyDriversEmpty = false;
  writes = [];
  reads = [];
  budget = {
    budgetLimit: 10_000_000,
    heldAmount: 200_000,
    spentAmount: 800_000,
    issuanceReserved: 500_000,
    availableAmount: 8_500_000,
  };
  vouchers = [
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
      description: "Giảm 20% mọi chuyến",
      campaignClaimCount: 10,
      campaignUsedCount: 5,
      campaignHeldCount: 1,
      campaignBudgetLimit: 2_000_000,
      campaignHeldAmount: 50_000,
      campaignSpentAmount: 250_000,
      campaignReleasedAmount: 0,
      systemReserveAmount: null,
    },
  ];
  ratings = [
    {
      id: 101,
      rideId: 11,
      direction: "CUSTOMER_TO_DRIVER",
      raterId: 21,
      raterName: "Khách A",
      rateeId: 41,
      rateeName: "Tài xế B",
      stars: 2,
      comment: "Nội dung cần kiểm duyệt",
      tags: ["Thái độ"],
      tip: 0,
      createdAt: "2026-11-08T04:00:00Z",
      hidden: false,
      hiddenAt: null,
      hiddenBy: null,
      hiddenReason: null,
    },
    {
      id: 102,
      rideId: 11,
      direction: "DRIVER_TO_CUSTOMER",
      raterId: 41,
      raterName: "Tài xế B",
      rateeId: 21,
      rateeName: "Khách A",
      stars: 5,
      comment: "Khách lịch sự",
      tags: [],
      tip: 0,
      createdAt: "2026-11-08T04:05:00Z",
      hidden: false,
      hiddenAt: null,
      hiddenBy: null,
      hiddenReason: null,
    },
  ];
  ledger = [
    {
      id: 901,
      action: "BUDGET_SET",
      amount: 10_000_000,
      note: "Thiết lập tổng quỹ",
      createdAt: "2026-11-08T01:00:00Z",
    },
  ];
  claimants = [
    {
      voucherId: 501,
      customerId: 21,
      fullName: "Nguyễn Văn A",
      phone: "0901234567",
      claimedAt: "2026-11-08T02:00:00Z",
      status: "USED",
      rideId: 11,
      discountAmount: 35_000,
    },
  ];

  configureAuth(async () => "test-token", () => {});

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const path = url.pathname;
      const method = init?.method ?? "GET";
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      if (method !== "GET") writes.push({ path, method, body });
      else reads.push(path);

      if (path === "/api/admin/dashboard") {
        return ok({
          gmv: 980_000,
          revenue: 24_000,
          promoCost: 10_000,
          grossProfit: 14_000,
          tripCount: 12,
          previousTripCount: 10,
          daily: [{ day: "2026-11-08", gmv: 120_000, revenue: 24_000 }],
          paymentMix: { cash: 1, wallet: 3, other: 0 },
          wallets: { driverCash: 90_000, customer: 25_000, driverCredit: 20_000, pendingWithdrawals: 0 },
          anomalies: [],
        });
      }
      if (path === "/ekyc/driver-verification/v1/admin/review-queue") return ok({ items: [], hasMore: false, totalElements: 0 });
      if (path === "/api/admin/withdrawals") return ok(page([], 0, 0, 5));
      if (
        path === "/api/admin/rides" ||
        path === "/api/admin/drivers" ||
        path === "/api/admin/customers"
      ) {
        return ok(page([]));
      }
      if (path === "/api/admin/vouchers/budget") {
        if (method === "PUT") {
          budget = { ...budget, budgetLimit: Number(body.budgetLimit) };
        }
        return ok(budget);
      }
      if (path === "/api/admin/vouchers/budget/ledger") return ok(ledger);
      if (path === "/api/admin/vouchers") {
        if (method === "POST") {
          const created: AdminVoucher = {
            ...vouchers[0],
            id: 2,
            code: String(body.code),
            campaignTitle: String(body.campaignTitle),
            description: String(body.description),
            campaignBudgetLimit: Number(body.campaignBudgetLimit),
            campaignClaimCount: 0,
            campaignUsedCount: 0,
          };
          vouchers = [created, ...vouchers];
          return ok(created);
        }
        return ok(vouchers);
      }
      if (path === "/api/admin/vouchers/1/claims") return ok(claimants);
      if (path === "/api/admin/rides/11") return ok(rideFixture);
      if (path === "/api/admin/customers/21") return ok(customerFixture);
      if (path === "/api/admin/rides/11/chat") return ok({ rideId: 11, messages: [], hasMore: false });
      if (path === "/api/admin/ratings") return ok(page(ratings));
      if (path === "/api/admin/ratings/101/visibility") {
        ratings = ratings.map((r) =>
          r.id === 101
            ? {
                ...r,
                hidden: Boolean(body.hidden),
                hiddenReason: (body.reason as string | null) ?? null,
                hiddenAt: body.hidden ? "2026-11-08T05:00:00Z" : null,
                hiddenBy: body.hidden ? 1 : null,
              }
            : r,
        );
        return ok(ratings[0]);
      }
      if (path === "/api/location/nearby-drivers") {
        return ok(nearbyDriversEmpty ? [] : [{ driverId: 41, distanceKm: 1.25, location: { lat: 21, lng: 105 } }]);
      }
      if (path === "/api/admin/drivers/41") return ok(driverFixture);
      if (path === "/api/admin/rides/11/assignable-drivers") return ok([41]);
      const ticketPayload = {
        ticket: {
          id: 77,
          code: "TCK-77",
          ownerId: 21,
          ownerName: "Khách A",
          ownerPhoneNumber: "0901234567",
          ownerRole: "CUSTOMER",
          category: "PAYMENT",
          rideId: 11,
          status: "IN_PROGRESS",
          createdAt: "2026-11-08T03:00:00Z",
          updatedAt: "2026-11-08T03:10:00Z",
          handledBy: 1,
        },
        description: "Cần hỗ trợ",
        images: [],
        hasOlderMessages: true,
        messages: [
          {
            id: 1,
            ticketId: 77,
            senderId: 21,
            senderRole: "CUSTOMER",
            body: "Tin nhắn kèm link không an toàn",
            imageUrl: "javascript:alert(1)",
            createdAt: "2026-11-08T03:01:00Z",
          },
          {
            id: 2,
            ticketId: 77,
            senderId: 1,
            senderRole: "ADMIN",
            body: "Ảnh hợp lệ",
            imageUrl: "https://cdn.ptitgo.me/support/proof.png",
            createdAt: "2026-11-08T03:02:00Z",
          },
        ],
      };
      if (path === "/api/admin/tickets/77" || path === "/api/admin/tickets/77/claim") {
        return ok(ticketPayload);
      }
      if (path === "/api/admin/tickets/77/messages" && url.searchParams.get("beforeId") === "1") {
        return ok([{
          ...ticketPayload.messages[0],
          id: 3,
          body: "Nội dung hỗ trợ trước đó",
          imageUrl: null,
          createdAt: "2026-11-08T03:00:30Z",
        }]);
      }
      return ok({});
    }),
  );
});

describe("GoAdmin post-merge integration & security regressions", () => {
  it("shows period promoCost as headline metric on dashboard instead of global budgetLimit", async () => {
    renderPage("/dashboard");
    const promoValue = await screen.findByText("10.000 ₫", {}, { timeout: 10_000 });
    const card = promoValue.closest(".dashboard-metric") as HTMLElement;
    expect(within(card).getByText("Chi phí khuyến mãi")).toBeInTheDocument();
    expect(await within(card).findByText(/Quỹ còn lại/, {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(within(card).getByRole("link", { name: "Quản lý quỹ" })).toHaveAttribute("href", "/vouchers");
    expect(within(card).queryByText("10.000.000 ₫")).not.toBeInTheDocument();
  });

  it("supports two-way ride rating hide/unhide and skips empty assignable-drivers check", async () => {
    nearbyDriversEmpty = true;
    const { user } = renderPage("/rides/11");

    await user.click(await screen.findByRole("tab", { name: "Đánh giá" }, { timeout: 10_000 }));
    expect(await screen.findByText("Khách hàng → Tài xế", {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText("Tài xế → Khách hàng")).toBeInTheDocument();

    const hideButtons = screen.getAllByRole("button", { name: "Ẩn đánh giá" });
    await user.click(hideButtons[0]);
    const dialog = await screen.findByRole("dialog", { name: "Ẩn đánh giá vi phạm" });
    await user.type(within(dialog).getByRole("textbox"), "  Ngôn từ xúc phạm  ");
    await user.click(within(dialog).getByRole("button", { name: "Xác nhận ẩn" }));

    await waitFor(() =>
      expect(writes).toContainEqual({
        path: "/api/admin/ratings/101/visibility",
        method: "PUT",
        body: { hidden: true, reason: "Ngôn từ xúc phạm" },
      }),
    );

    const unhideButton = await screen.findByRole("button", { name: "Hiện lại" });
    await user.click(unhideButton);
    await waitFor(() =>
      expect(writes).toContainEqual({
        path: "/api/admin/ratings/101/visibility",
        method: "PUT",
        body: { hidden: false, reason: null },
      }),
    );

    await user.click(screen.getByRole("button", { name: "Gán tài xế" }));
    expect(await screen.findByText("Gán tài xế · Chuyến #11")).toBeInTheDocument();
    await waitFor(() =>
      expect(reads).toContain("/api/location/nearby-drivers"),
    );
    expect(writes.filter((w) => w.path.endsWith("/assignable-drivers"))).toHaveLength(0);
  });

  it("validates voucher dates, uppercases code, and opens campaign claimants & ledger", async () => {
    const { user } = renderPage("/vouchers");
    const main = await screen.findByRole("main");
    expect(await within(main).findByText("TET2026", {}, { timeout: 10_000 })).toBeInTheDocument();

    fireEvent.change(within(main).getByLabelText("Tên chiến dịch / Khẩu hiệu thông báo"), { target: { value: "Chiến dịch mới" } });
    fireEvent.change(within(main).getByLabelText("Mã khuyến mãi"), { target: { value: "sale50" } });
    fireEvent.change(within(main).getByLabelText("Mức giảm (%)"), { target: { value: "20" } });
    fireEvent.change(within(main).getByLabelText("Giảm tối đa (đ)"), { target: { value: "50000" } });
    fireEvent.change(within(main).getByLabelText("Tổng suất nhận"), { target: { value: "10" } });
    fireEvent.change(within(main).getByLabelText(/Quỹ chiến dịch/), { target: { value: "500000" } });
    fireEvent.change(within(main).getByLabelText("Mô tả chi tiết điều kiện & nội dung thông báo"), { target: { value: "Áp dụng toàn quốc" } });

    fireEvent.change(within(main).getByLabelText("Thời gian bắt đầu"), { target: { value: "2026-12-10T10:00" } });
    fireEvent.change(within(main).getByLabelText("Thời gian kết thúc"), { target: { value: "2026-12-09T10:00" } });
    const submitBtn = within(main).getByText("Phát hành chiến dịch mới").closest("button")!;
    await user.click(submitBtn);

    expect(await within(main).findByText("Thời gian kết thúc phải sau thời gian bắt đầu", {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(writes.filter((w) => w.path === "/api/admin/vouchers")).toHaveLength(0);

    fireEvent.change(within(main).getByLabelText("Thời gian kết thúc"), { target: { value: "2026-12-20T10:00" } });
    await user.click(submitBtn);

    await waitFor(() =>
      expect(writes.some((w) => w.path === "/api/admin/vouchers" && w.body.code === "SALE50")).toBe(true),
    );

    await user.click(within(main).getByText(/Lịch sử biến động quỹ/).closest("button")!);
    const ledgerDialog = await screen.findByRole("dialog", { name: /Sổ cái biến động quỹ/ }, { timeout: 10_000 });
    expect(within(ledgerDialog).getByText("Thiết lập tổng quỹ")).toBeInTheDocument();
    const ledgerCloseButtons = within(ledgerDialog).getAllByRole("button", { name: /^Đóng$/ });
    await user.click(ledgerCloseButtons[ledgerCloseButtons.length - 1]);

    const detailLabels = within(main).getAllByText(/^Chi tiết$/);
    await user.click(detailLabels[detailLabels.length - 1].closest("button")!);
    expect(await screen.findByText("Nguyễn Văn A", {}, { timeout: 10_000 })).toBeInTheDocument();
  });

  it("blocks non-https image URLs in support ticket chat bubbles", async () => {
    renderPage("/tickets/77");
    expect(await screen.findByText("Tin nhắn kèm link không an toàn", {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText("Ảnh hợp lệ")).toBeInTheDocument();

    const imgs = screen.getAllByAltText("Ảnh trong hội thoại hỗ trợ");
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute("src", "https://cdn.ptitgo.me/support/proof.png");
  });

  it("loads the previous page in chronological order without replacing the latest messages", async () => {
    const { user } = renderPage("/tickets/77");
    const older = await screen.findByRole("button", { name: "Tải tin nhắn cũ hơn" }, { timeout: 10_000 });
    await user.click(older);
    const previous = await screen.findByText("Nội dung hỗ trợ trước đó");
    const current = screen.getByText("Ảnh hợp lệ");
    expect(previous.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Tải tin nhắn cũ hơn" })).not.toBeInTheDocument();
  });
});
