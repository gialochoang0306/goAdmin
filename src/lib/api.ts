import type {
  AdminWithdrawal,
  WithdrawalReview,
  Params,
  Page,
  Ride,
  RideDetail,
  Driver,
  DriverDetail,
  Customer,
  CustomerDetail,
  WalletTransaction,
  NearbyDriver,
  MessagePage,
  Pricing,
  PricingInput,
  Profile,
  TicketDetail,
  TicketMessage,
  TicketStatus,
  TicketSummary,
  SendTicketMessage,
  DashboardPeriod,
  DashboardSummary,
  AdminVoucher,
  PromoBudget,
  AdminRatingItem,
  CampaignClaimant,
  BudgetLedgerItem,
} from "../types";

export class ApiError extends Error {
  constructor(
    message: string,
    public code = "NETWORK_ERROR",
    public status = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
let tokenProvider: (refresh?: boolean) => Promise<string | null> = async () =>
  null;
let expired: () => void = () => {};
export function configureAuth(
  getToken: typeof tokenProvider,
  onExpired: () => void,
) {
  tokenProvider = getToken;
  expired = onExpired;
}
export const errorMessage = (e: unknown) =>
  e instanceof Error
    ? e.message
    : "Không thể thực hiện thao tác. Vui lòng thử lại.";

// Wire DTOs mix snake_case (driver/vehicle) and camelCase (customer/ride).
export function normalize<T>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => normalize(v)) as T;
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase()),
        normalize(v),
      ]),
    ) as T;
  return value as T;
}
const base = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"
).replace(/\/$/, "");
export async function request<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    params?: Params;
    token?: string;
  } = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const query = new URLSearchParams();
  Object.entries(options.params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") query.set(k, String(v));
  });
  const url = `${base}${path}${query.size ? `?${query}` : ""}`;
  const send = async (refresh = false): Promise<T> => {
    let token: string | null;
    try {
      token = options.token ?? (await tokenProvider(refresh));
    } catch {
      expired();
      throw new ApiError(
        "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        "UNAUTHORIZED",
        401,
      );
    }
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        signal: AbortSignal.timeout(20_000),
        headers: {
          Accept: "application/json",
          ...(options.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(token
            ? { Authorization: `Bearer ${token}`, "X-Role": "ADMIN" }
            : {}),
        },
        ...(options.body !== undefined
          ? { body: JSON.stringify(options.body) }
          : {}),
      });
    } catch {
      throw new ApiError(
        method === "GET"
          ? "Không kết nối được máy chủ. Kiểm tra kết nối và thử lại."
          : "Chưa xác nhận được kết quả. Hãy làm mới dữ liệu để kiểm tra trước khi gửi lại.",
      );
    }
    if (
      response.status === 401 &&
      method === "GET" &&
      !refresh &&
      !options.token
    )
      return send(true);
    if (response.status === 401 || response.status === 403) {
      if (response.status === 401) expired();
    }
    let envelope: {
      success?: boolean;
      data?: unknown;
      error?: { code?: string; message?: string };
    };
    try {
      envelope = await response.json();
    } catch {
      throw new ApiError(
        "Máy chủ trả dữ liệu không hợp lệ.",
        "INVALID_RESPONSE",
        response.status,
      );
    }
    if (!response.ok || envelope.success !== true) {
      if (envelope.error?.code === "ACCOUNT_LOCKED") expired();
      throw new ApiError(
        envelope.error?.message ||
          (response.status === 403
            ? "Bạn không có quyền thực hiện thao tác này."
            : "Không thể thực hiện yêu cầu."),
        envelope.error?.code ?? "REQUEST_FAILED",
        response.status,
      );
    }
    return normalize<T>(envelope.data);
  };
  return send();
}
const admin = "/api/admin";
export const api = {
  rideRatings: (rideId: number) =>
    request<Page<AdminRatingItem>>(`${admin}/ratings?rideId=${rideId}&size=20`),
  setRatingVisibility: (ratingId: number, hidden: boolean, reason?: string) =>
    request<AdminRatingItem>(`${admin}/ratings/${ratingId}/visibility`, {
      method: "PUT",
      body: { hidden, reason: reason?.trim() || null },
    }),
  vouchers: () => request<AdminVoucher[]>(`${admin}/vouchers`),
  voucherClaimants: (id: number) => request<CampaignClaimant[]>(`${admin}/vouchers/${id}/claims`),
  setVoucherStatus: (id: number, active: boolean) =>
    request<void>(`${admin}/vouchers/${id}/status`, { method: "PATCH", body: { active } }),
  promoBudget: () => request<PromoBudget>(`${admin}/vouchers/budget`),
  promoBudgetLedger: () => request<BudgetLedgerItem[]>(`${admin}/vouchers/budget/ledger`),
  setPromoBudget: (budgetLimit: number) =>
    request<PromoBudget>(`${admin}/vouchers/budget`, { method: "PUT", body: { budgetLimit } }),
  createVoucher: (body: Record<string, unknown>) =>
    request<AdminVoucher>(`${admin}/vouchers`, { method: "POST", body }),
  login: (idToken: string) =>
    request<Profile>("/api/auth/admin/login", {
      method: "POST",
      body: { idToken },
      token: idToken,
    }),
  me: () => request<Profile>("/api/auth/me"),
  logout: (installationId: string) =>
    request("/api/auth/logout", { method: "POST", body: { installationId } }),
  dashboard: (days: DashboardPeriod) =>
    request<DashboardSummary>(`${admin}/dashboard`, { params: { days } }),
  tickets: (page: number, status?: TicketStatus, params: Params = {}) =>
    request<Page<TicketSummary>>(`${admin}/tickets`, { params: { page, size: 20, status, ...params } }),
  ticket: (id: number) => request<TicketDetail>(`${admin}/tickets/${id}`),
  ticketMessages: (id: number, beforeId: number) =>
    request<TicketMessage[]>(`${admin}/tickets/${id}/messages`, { params: { beforeId } }),
  claimTicket: (id: number) =>
    request<TicketDetail>(`${admin}/tickets/${id}/claim`, { method: "POST", body: {} }),
  sendTicketMessage: (id: number, body: SendTicketMessage) =>
    request<TicketMessage>(`${admin}/tickets/${id}/messages`, { method: "POST", body }),
  uploadSupportSignature: () =>
    request<{
      signature: string;
      timestamp: number;
      apiKey: string;
      cloudName: string;
      folder: string;
      allowedFormats: string[] | null;
    }>("/api/uploads/signature", { params: { purpose: "SUPPORT" } }),
  rides: (params: Params = {}) =>
    request<Page<Ride>>(`${admin}/rides`, { params }),
  rideFilterCapabilities: async () => {
    try {
      return await request<{ search: boolean; createdRange: boolean }>(`${admin}/rides/filter-capabilities`);
    } catch (error) {
      // Older servers resolve the missing route as /rides/{id} and return 400.
      if (error instanceof ApiError && [400, 404].includes(error.status))
        return { search: false, createdRange: false };
      throw error;
    }
  },
  ride: (id: number) => request<RideDetail>(`${admin}/rides/${id}`),
  chat: (id: number, params: Params = {}) =>
    request<MessagePage>(`${admin}/rides/${id}/chat`, {
      params: { size: 30, ...params },
    }),
  assignableDriverIds: (id: number, driverIds: number[]) =>
    request<number[]>(`${admin}/rides/${id}/assignable-drivers`, { method: "POST", body: driverIds }),
  assign: (id: number, driverId: number) =>
    request(`${admin}/rides/${id}/assign`, {
      method: "POST",
      body: { driver_id: driverId },
    }),
  cancel: (id: number, reason: string) =>
    request(`${admin}/rides/${id}/cancel`, {
      method: "POST",
      body: { reason },
    }),
  drivers: (params: Params = {}) =>
    request<Page<Driver>>(`${admin}/drivers`, { params }),
  driver: (id: number) => request<DriverDetail>(`${admin}/drivers/${id}`),
  offline: (id: number) =>
    request(`${admin}/drivers/${id}/force-offline`, { method: "POST" }),
  driverStatus: (
    id: number,
    accountStatus: string,
    reason?: string,
    withdrawalFrozen?: boolean,
  ) =>
    request<DriverDetail>(`${admin}/drivers/${id}/status`, {
      method: "PUT",
      body: {
        account_status: accountStatus,
        reason,
        ...(withdrawalFrozen !== undefined
          ? { withdrawal_frozen: withdrawalFrozen }
          : {}),
      },
    }),
  driverWithdrawalFreeze: (
    id: number,
    withdrawalFrozen: boolean,
    reason?: string,
  ) =>
    request<DriverDetail>(`${admin}/drivers/${id}/withdrawal-freeze`, {
      method: "PUT",
      body: {
        withdrawal_frozen: withdrawalFrozen,
        reason,
      },
    }),
  customers: (params: Params = {}) =>
    request<Page<Customer>>(`${admin}/customers`, { params }),
  customer: (id: number) => request<CustomerDetail>(`${admin}/customers/${id}`),
  customerRides: (id: number, params: Params = {}) =>
    request<Page<Ride>>(`${admin}/customers/${id}/rides`, { params }),
  transactions: (id: number, params: Params = {}) =>
    request<Page<WalletTransaction>>(
      `${admin}/customers/${id}/wallet-transactions`,
      { params },
    ),
  customerStatus: (id: number, status: string, reason?: string) =>
    request(`${admin}/customers/${id}/status`, {
      method: "PUT",
      body: { status, reason },
    }),
  customerFlag: (id: number, flagged: boolean, note?: string) =>
    request(`${admin}/customers/${id}/flag`, {
      method: "PUT",
      body: { flagged, note },
    }),
  nearby: (longitude: number, latitude: number, radius: number) =>
    request<NearbyDriver[]>("/api/location/nearby-drivers", {
      params: { longitude, latitude, radius },
    }),
  withdrawals: (params: Params = {}) => request<Page<AdminWithdrawal>>(`${admin}/withdrawals`, { params }),
  reviewWithdrawal: (id: number, body: WithdrawalReview) =>
    request<{ id: number; status: AdminWithdrawal["status"] }>(`${admin}/withdrawals/${id}/review`, { method: "POST", body }),
  pricing: () => request<Pricing[]>(`${admin}/pricing-rules`),
  savePricing: (values: PricingInput, id?: number) => {
    const { vehicleType, active, ...fees } = values;
    return request<Pricing>(`${admin}/pricing-rules${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      body: id ? fees : { ...fees, vehicle_type: vehicleType, active },
    });
  },
  activate: (id: number) =>
    request(`${admin}/pricing-rules/${id}/activate`, { method: "POST" }),
  deactivate: (id: number, force = false) =>
    request(`${admin}/pricing-rules/${id}/deactivate`, {
      method: "POST",
      params: { force },
    }),
};

export async function mapConcurrent<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>,
  concurrency = 4,
): Promise<R[]> {
  const result: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (next < items.length) {
        const index = next++;
        result[index] = await mapper(items[index]);
      }
    }),
  );
  return result;
}

const verificationBase = (() => {
  const configured = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
  try {
    const url = new URL(configured);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      || /^(10\.\d{1,3}|192\.168|172\.(1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}$/.test(url.hostname);
    if (url.pathname === "/" && !url.username && !url.password && !url.search && !url.hash
      && (url.protocol === "https:" || (import.meta.env.DEV && local && url.protocol === "http:")))
      return url.origin;
  } catch { /* Unconfigured environments keep the feature off. */ }
  return null;
})();

export const verificationEnabled = Boolean(verificationBase);
export async function verificationFetch<T = unknown>(path: string, options: {
  signal?: AbortSignal; body?: unknown; binary?: boolean; timeoutMs?: number;
} = {}): Promise<T> {
  if (!verificationBase) throw new ApiError("Chưa cấu hình máy chủ xác minh.");
  const timeout = AbortSignal.timeout(options.timeoutMs ?? 20_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const send = async (refresh: boolean) => {
    let token: string | null;
    try { token = await tokenProvider(refresh); }
    catch { throw new ApiError("Phiên đăng nhập đã hết hạn.", "UNAUTHORIZED", 401); }
    if (!token) throw new ApiError("Vui lòng đăng nhập.", "UNAUTHORIZED", 401);
    return fetch(verificationBase + "/ekyc/driver-verification/v1/admin/" + path, {
      signal, cache: "no-store", credentials: "omit", redirect: "error",
      method: options.body === undefined ? "GET" : "POST",
      headers: {
        Authorization: "Bearer " + token,
        "X-Role": "ADMIN",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  };
  let response: Response;
  try {
    response = await send(false);
    if (response.status === 401 && options.body === undefined) response = await send(true);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Không nhận được phản hồi. Hãy làm mới hồ sơ trước khi thử lại.");
  }
  const mime = response.headers.get("content-type") ?? "";
  if (options.binary && response.ok && /^image\/(jpeg|png|webp)$/.test(mime)) return await response.blob() as T;
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success !== true || options.binary) {
    const code = result?.errorCode ?? result?.error?.code;
    const messages: Record<string, string> = {
      BAD_REQUEST: "Dữ liệu xét duyệt không đúng định dạng. Hãy làm mới hồ sơ và kiểm tra phiên bản web admin/backend.",
      INVALID_REQUEST: "Thông tin xét duyệt chưa hợp lệ. Kiểm tra quyết định, lý do và các mục yêu cầu bổ sung.",
      VERIFICATION_ACTIVATION_BLOCKED: "Hồ sơ có cảnh báo chặn kích hoạt. Hãy kiểm tra cảnh báo và yêu cầu tài xế bổ sung trước khi phê duyệt.",
      FORBIDDEN: "Tài khoản chưa có quyền duyệt hồ sơ eKYC.",
      UNAUTHORIZED: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
      REVISION_CONFLICT: "Hồ sơ đã thay đổi. Hãy làm mới và kiểm tra lại bản hiện tại.",
      INVALID_TRANSITION: "Hồ sơ đã chuyển trạng thái. Hãy làm mới trước khi duyệt.",
      DOCUMENT_REMOVED: "Ảnh đã hết thời hạn lưu.",
      ENGINE_BUSY: "Máy chủ đang bận. Hãy thử lại sau.",
      ENGINE_TIMEOUT: "Lượt đối chiếu quá thời gian. Bạn vẫn có thể duyệt thủ công.",
    };
    throw new ApiError(messages[code] ?? "Không thực hiện được yêu cầu eKYC.",
      code, response.status);
  }
  return result.data as T;
}
