import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { AdminApp } from "../App";
import { configureAuth } from "../lib/api";
import { fail, ok, profile } from "./fixtures";
vi.mock("../auth", () => ({ useAuth: () => ({ profile, loading: false, logout: vi.fn() }) }));
const base = { id: 42, driverId: 7, driverName: "Nguyễn Văn An", driverPhoneNumber: "0912345678", bankName: "Vietcombank", bankAccountNumber: "00123456789", amount: 500000, status: "PENDING", createdAt: "2026-11-08T02:00:00Z", reviewedAt: null, reviewedBy: null, rejectReason: null };
let item = { ...base };
let conflict = false;
const writes: { action: string; rejectReason?: string }[] = [];
const lists: string[] = [];
beforeEach(() => {
  item = { ...base }; conflict = false; writes.length = 0; lists.length = 0;
  configureAuth(async () => "test-token", () => {});
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const { pathname, search, searchParams } = new URL(String(url));
    if (pathname === "/api/admin/withdrawals") {
      lists.push(search);
      const rows = !searchParams.get("status") || searchParams.get("status") === item.status ? [item] : [];
      return ok({ content: rows, page: Number(searchParams.get("page") ?? 0), size: 20, totalElements: rows.length, totalPages: 1, hasNext: false });
    }
    if (pathname === "/api/admin/withdrawals/42/review" && init?.method === "POST") {
      const body = JSON.parse(String(init.body)); writes.push(body);
      if (conflict) { item.status = "SUCCESS"; return fail(409, "Yêu cầu đã được xử lý."); }
      item.status = body.action === "APPROVE" ? "SUCCESS" : "REJECTED";
      return ok({ ...item, rejectReason: body.rejectReason ?? null });
    }
    return fail(404, "Không tìm thấy");
  }));
});
function setup(path = "/withdrawals") {
  const router = createMemoryRouter([{ path: "*", element: <AdminApp /> }], { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<ConfigProvider theme={{ token: { motion: false } }}><AntApp><QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider></AntApp></ConfigProvider>);
  return { user: userEvent.setup({ pointerEventsCheck: 0 }), client, router };
}
it("shows bank details, defaults to pending and approves only after transfer confirmation", async () => {
  const { user } = setup();
  expect(await screen.findByText("00123456789")).toBeInTheDocument();
  expect(lists[0]).toBe("?page=0&size=20&status=PENDING");
  await user.click(screen.getByRole("button", { name: "Duyệt yêu cầu #42" }));
  const dialog = within(await screen.findByRole("dialog"));
  const approve = dialog.getByRole("button", { name: "Xác nhận đã chuyển tiền" });
  expect(approve).toBeDisabled();
  await user.click(dialog.getByRole("checkbox"));
  await user.dblClick(approve);
  await waitFor(() => expect(writes).toEqual([{ action: "APPROVE" }]));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(await screen.findByText("Không có dữ liệu phù hợp")).toBeInTheDocument();
});
it("requires a trimmed rejection reason and refreshes the queue after refund", async () => {
  const { user } = setup();
  await user.click(await screen.findByRole("button", { name: "Từ chối yêu cầu #42" }));
  const dialog = within(await screen.findByRole("dialog"));
  const reject = dialog.getByRole("button", { name: "Từ chối và hoàn tiền" });
  expect(reject).toBeDisabled();
  await user.type(dialog.getByRole("textbox"), "  Sai số tài khoản  ");
  await user.click(reject);
  await waitFor(() => expect(writes).toEqual([{ action: "REJECT", rejectReason: "Sai số tài khoản" }]));
  expect(await screen.findByText("Đã từ chối và hoàn tiền vào ví tài xế.")).toBeInTheDocument();
});
it("refreshes a conflicting review and blocks a duplicate action", async () => {
  conflict = true;
  const { user } = setup();
  await user.click(await screen.findByRole("button", { name: "Duyệt yêu cầu #42" }));
  const dialog = within(await screen.findByRole("dialog"));
  await user.click(dialog.getByRole("checkbox"));
  await user.click(dialog.getByRole("button", { name: "Xác nhận đã chuyển tiền" }));
  expect(await dialog.findByText("Yêu cầu đã được xử lý.")).toBeInTheDocument();
  await waitFor(() => expect(dialog.getByRole("button", { name: "Xác nhận đã chuyển tiền" })).toBeDisabled());
  expect(writes).toHaveLength(1);
});
it("disables approval without bank details and hides actions on processed rows", async () => {
  item.bankAccountNumber = "";
  const { user, client, router } = setup();
  expect(await screen.findByRole("button", { name: "Duyệt yêu cầu #42" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Từ chối yêu cầu #42" })).toBeEnabled();
  await user.click(screen.getByRole("combobox", { name: "Lọc trạng thái rút tiền" }));
  await user.click(await screen.findByText("Tất cả trạng thái", { selector: ".ant-select-item-option-content" }));
  await waitFor(() => expect(router.state.location.search).toBe("?status=ALL"));
  item.status = "SUCCESS";
  await client.invalidateQueries({ queryKey: ["admin", "withdrawals"] });
  expect(await screen.findByText("Đã xử lý")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Duyệt yêu cầu #42" })).not.toBeInTheDocument();
});
