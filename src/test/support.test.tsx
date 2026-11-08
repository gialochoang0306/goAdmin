import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AdminApp } from "../App";
import { configureAuth } from "../lib/api";
import { fail, ok, profile } from "./fixtures";

vi.mock("../auth", () => ({
  useAuth: () => ({ profile, loading: false, logout: vi.fn() }),
}));

const baseTicket = {
  id: 41,
  code: "HT-41",
  rideId: 11,
  category: "PAYMENT",
  description: "Tôi cần kiểm tra lại khoản thanh toán.",
  status: "OPEN",
  response: null as string | null,
  images: [{ fileUrl: "https://example.test/photo.jpg", publicId: "photo" }],
  ownerId: 21,
  ownerRole: "CUSTOMER",
  createdAt: "2026-11-04T02:00:00Z",
  updatedAt: "2026-11-04T02:00:00Z",
};
let ticket: typeof baseTicket;
let rejectUpdate: boolean;
const listRequests: string[] = [];
const updates: { status: string; response: string | null; expectedUpdatedAt?: string }[] = [];

beforeEach(() => {
  ticket = structuredClone(baseTicket);
  rejectUpdate = false;
  listRequests.length = 0;
  updates.length = 0;
  configureAuth(async () => "test-token", () => {});
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const { pathname, search, searchParams } = new URL(String(input));
    if (pathname === "/api/admin/support/tickets") {
      listRequests.push(search);
      const status = searchParams.get("status");
      if (searchParams.get("page") === "1") return ok([{ ...baseTicket, id: 1, code: "HT-1" }]);
      const rows = [ticket, ...Array.from({ length: 19 }, (_, index) => ({
        ...baseTicket, id: 40 - index, code: `HT-${40 - index}`,
      }))];
      return ok(rows.filter((item) => !status || item.status === status));
    }
    if (pathname === "/api/admin/support/tickets/41") {
      if (init?.method === "PATCH") {
        const update = JSON.parse(String(init.body));
        updates.push(update);
        if (rejectUpdate) return fail(409, "Không thể lưu phản hồi.");
        ticket = { ...ticket, ...update, updatedAt: "2026-11-08T03:00:00Z" };
      }
      return ok(ticket);
    }
    return fail(404, "Không tìm thấy", "NOT_FOUND");
  }));
});

function renderSupport(path: string) {
  const router = createMemoryRouter([{ path: "*", element: <AdminApp /> }], { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <AntApp>
        <QueryClientProvider client={client}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>,
  );
  return { user: userEvent.setup({ pointerEventsCheck: 0 }), router, client };
}

it("pages through support tickets and resets the page when the status filter changes", async () => {
  const { user, router } = renderSupport("/support?status=OPEN");
  expect(await screen.findByRole("link", { name: "HT-41" })).toBeInTheDocument();
  expect(listRequests).toContain("?page=0&status=OPEN");

  await user.click(screen.getByRole("button", { name: "Trang sau" }));
  expect(await screen.findByRole("link", { name: "HT-1" })).toBeInTheDocument();
  expect(listRequests).toContain("?page=1&status=OPEN");
  expect(screen.getByRole("button", { name: "Trang sau" })).toBeDisabled();

  await user.click(screen.getByRole("combobox", { name: "Lọc trạng thái" }));
  await user.click(await screen.findByText("Đã giải quyết", { selector: ".ant-select-item-option-content" }));
  await waitFor(() => expect(listRequests).toContain("?page=0&status=RESOLVED"));
  expect(router.state.location.search).toBe("?status=RESOLVED");
  expect(await screen.findByText("Không có dữ liệu phù hợp")).toBeInTheDocument();
});

it("opens a ticket, requires a response to close it, and preserves the draft after an update error", async () => {
  const { user, router } = renderSupport("/support?status=OPEN");
  await user.click(await screen.findByRole("link", { name: "HT-41" }));
  expect(await screen.findByText(baseTicket.description)).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Ảnh đính kèm 1" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Chuyến #11" })).toHaveAttribute("href", "/rides/11");

  await user.click(screen.getByRole("combobox", { name: "Trạng thái" }));
  await user.click(await screen.findByText("Đã giải quyết", { selector: ".ant-select-item-option-content" }));
  await user.click(screen.getByRole("button", { name: "Lưu cập nhật" }));
  expect(await screen.findByText("Nhập phản hồi trước khi đóng yêu cầu.")).toBeInTheDocument();
  expect(updates).toHaveLength(0);

  const response = screen.getByRole("textbox", { name: "Phản hồi" });
  await user.type(response, "  Đã kiểm tra thanh toán.  ");
  rejectUpdate = true;
  await user.click(screen.getByRole("button", { name: "Lưu cập nhật" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Không thể lưu phản hồi.");
  expect(response).toHaveValue("  Đã kiểm tra thanh toán.  ");

  rejectUpdate = false;
  await user.click(screen.getByRole("button", { name: "Lưu cập nhật" }));
  expect(await screen.findByText("Đã cập nhật yêu cầu HT-41.")).toBeInTheDocument();
  expect(updates).toEqual([
    { status: "RESOLVED", response: "Đã kiểm tra thanh toán.", expectedUpdatedAt: baseTicket.updatedAt },
    { status: "RESOLVED", response: "Đã kiểm tra thanh toán.", expectedUpdatedAt: baseTicket.updatedAt },
  ]);
  await user.click(screen.getByRole("link", { name: "Quay lại danh sách" }));
  expect(router.state.location.search).toBe("?status=OPEN");
  expect(await screen.findByRole("link", { name: "HT-40" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "HT-41" })).not.toBeInTheDocument();
});


it("keeps an admin draft when a newer response arrives and requires reloading before overwriting it", async () => {
  ticket.ownerRole = "DRIVER";
  const { user, client } = renderSupport("/support/41");
  expect(await screen.findByText("Tài xế #21")).toBeInTheDocument();
  const response = screen.getByRole("textbox", { name: "Phản hồi" });
  await user.type(response, "Nội dung tôi đang nhập");
  ticket = { ...ticket, status: "IN_PROGRESS", response: "Admin khác đang kiểm tra", updatedAt: "2026-11-08T02:00:00Z" };
  await client.invalidateQueries({ queryKey: ["admin", "support-tickets", "detail", 41] });
  expect(await screen.findByText("Yêu cầu đã có cập nhật mới. Nội dung đang nhập của bạn được giữ lại.")).toBeInTheDocument();
  expect(response).toHaveValue("Nội dung tôi đang nhập");
  expect(screen.getByRole("button", { name: "Lưu cập nhật" })).toBeDisabled();
  expect(updates).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Tải phản hồi mới nhất" }));
  await user.click(await screen.findByRole("button", { name: "Tải bản mới" }));
  expect(response).toHaveValue("Admin khác đang kiểm tra");
  await user.click(screen.getByRole("button", { name: "Lưu cập nhật" }));
  await waitFor(() => expect(updates).toEqual([{ status: "IN_PROGRESS", response: "Admin khác đang kiểm tra", expectedUpdatedAt: "2026-11-08T02:00:00Z" }]));
});
