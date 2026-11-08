import type {
  AdminWithdrawal,
  WithdrawalReview,
  Params,
  Page,
  Ride,
  RideDetail,
  Driver,
  DriverDetail,
  DocumentQueue,
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
  documents: (params: Params = {}) =>
    request<Page<DocumentQueue>>(`${admin}/driver-documents`, { params }),
  review: (id: number, status: string, rejectionReason?: string) =>
    request(`${admin}/driver-documents/${id}/review`, {
      method: "PUT",
      body: { status, rejection_reason: rejectionReason },
    }),
  verifySkill: (id: number, verified: boolean) =>
    request(`${admin}/driver-skills/${id}/verify`, {
      method: "PUT",
      body: { verified },
    }),
  verifyDriver: (id: number, status: string, rejectionReason?: string) =>
    request(`${admin}/drivers/${id}/verification-status`, {
      method: "PUT",
      body: { status, rejection_reason: rejectionReason },
    }),
  offline: (id: number) =>
    request(`${admin}/drivers/${id}/force-offline`, { method: "POST" }),
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
