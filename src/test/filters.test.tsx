import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, ConfigProvider } from "antd";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { useFilters } from "../lib/hooks";
import { AdminApp } from "../App";
import { configureAuth } from "../lib/api";
import { customer, profile, ok, fail } from "./fixtures";
vi.mock("../auth", () => ({ useAuth: () => ({ profile, loading: false, logout: vi.fn() }) }));
const reads: URL[] = [];
beforeEach(() => {
  reads.length = 0;
  configureAuth(async () => "test-token", () => {});
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(String(input)); reads.push(url);
    if (url.pathname === "/api/admin/customers/21") return ok(customer);
    if (url.pathname.endsWith("filter-capabilities")) return ok({ search: true, createdRange: true });
    if (url.pathname.endsWith("pricing-rules")) return ok([]);
    if (/\/api\/admin\/(tickets|withdrawals|rides|drivers|customers)(\/21\/wallet-transactions)?$/.test(url.pathname))
      return ok({ content: [], page: Number(url.searchParams.get("page") || 0), size: Number(url.searchParams.get("size") || 20), totalElements: 0, totalPages: 0, hasNext: false });
    return fail(404, "Không tìm thấy");
  }));
});
function setup(path: string) {
  const router = createMemoryRouter([{ path: "*", element: <AdminApp /> }], { initialEntries: [path] });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<ConfigProvider theme={{token:{motion:false}}}><AntApp><QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider></AntApp></ConfigProvider>);
  return { router, user: userEvent.setup({pointerEventsCheck:0}) };
}
it.each([
  ["/tickets?q=HT-42&ownerRole=DRIVER&category=PAYMENT&page=2&size=50", "/api/admin/tickets", {q:"HT-42",ownerRole:"DRIVER",category:"PAYMENT"}],
  ["/withdrawals?q=00123&status=ALL&page=2&size=50", "/api/admin/withdrawals", {q:"00123"}],
  ["/customers/21?tab=wallet&walletq=%25_&walletType=DEPOSIT&walletStatus=SUCCESS&page=2&size=50", "/api/admin/customers/21/wallet-transactions", {q:"%_",type:"DEPOSIT",status:"SUCCESS"}],
])("sends combined URL filters to the server before pagination: %s", async (path, endpoint, expected) => {
  const {user,router} = setup(path);
  await waitFor(()=>expect(reads.some(url=>url.pathname===endpoint)).toBe(true));
  const request = reads.find(url=>url.pathname===endpoint)!;
  expect(request.searchParams.get("page")).toBe("2");
  expect(request.searchParams.get("size")).toBe("50");
  for (const [key,value] of Object.entries(expected)) expect(request.searchParams.get(key)).toBe(value);
  await user.click(screen.getByRole("button",{name:"Xóa bộ lọc"}));
  await waitFor(()=>expect(new URLSearchParams(router.state.location.search).has("page")).toBe(false));
  expect(new URLSearchParams(router.state.location.search).get("size")).toBe("50");
  if (path.includes("tab=wallet")) expect(new URLSearchParams(router.state.location.search).get("tab")).toBe("wallet");
});
it.each(["/tickets", "/withdrawals"])("converts both date bounds from Vietnam time: %s",async path=>{
  setup(path+"?from=2026-11-08&to=2026-11-08");
  await waitFor(()=>expect(reads.some(url=>url.pathname===`/api/admin${path}`)).toBe(true));
  const params = reads.find(url=>url.pathname===`/api/admin${path}`)!.searchParams;
  expect(params.get("createdFrom")).toBe("2026-11-07T17:00:00.000Z");
  expect(params.get("createdTo")).toBe("2026-11-08T17:00:00.000Z");
});
it.each(["/tickets", "/withdrawals"])("blocks invalid dates without sending a list request: %s",async path=>{
  setup(path+"?from=2026-11-09&to=2026-11-08");
  expect(await screen.findByText("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.")).toBeInTheDocument();
  expect(reads.some(url=>url.pathname===`/api/admin${path}`)).toBe(false);
});

it("resets the page on page-size changes and preserves other URL filters", async () => {
  function Controls() {
    const filters = useFilters();
    return <button onClick={()=>filters.update({page:4,size:100},false)}>Đổi số dòng</button>;
  }
  const router = createMemoryRouter([{path:"*",element:<Controls/>}],{initialEntries:["/rides?q=An&status=COMPLETED&page=4&size=20"]});
  render(<RouterProvider router={router}/>);
  await userEvent.click(screen.getByRole("button",{name:"Đổi số dòng"}));
  const params = new URLSearchParams(router.state.location.search);
  expect(params.has("page")).toBe(false);
  expect(params.get("size")).toBe("100");
  expect(params.get("q")).toBe("An");
  expect(params.get("status")).toBe("COMPLETED");
});
