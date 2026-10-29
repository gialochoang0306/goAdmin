import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider } from "antd";
import { AuthProvider, useAuth } from "../auth";
import { Login } from "../App";
import { profile } from "./fixtures";

const h = vi.hoisted(() => {
  const user = { getIdToken: vi.fn(async () => "firebase-token") };
  return {
    user,
    auth: { currentUser: null as null | typeof user },
    listener: null as null | ((account: null | typeof user) => void),
    me: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    persistence: vi.fn(),
  };
});
vi.mock("../lib/firebase", () => ({ firebaseAuth: h.auth, configError: null }));
vi.mock("firebase/auth", () => ({
  browserSessionPersistence: "SESSION",
  setPersistence: h.persistence,
  signInWithEmailAndPassword: h.signIn,
  signOut: h.signOut,
  onAuthStateChanged: (_auth: unknown, callback: typeof h.listener) => {
    h.listener = callback;
    queueMicrotask(() => callback?.(h.auth.currentUser));
    return () => {
      h.listener = null;
    };
  },
}));
vi.mock("../lib/api", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/api")>();
  return {
    ...original,
    api: { ...original.api, me: h.me, login: h.login, logout: h.logout },
  };
});
function Probe() {
  const auth = useAuth();
  return (
    <>
      <h1>Phiên của {auth.profile?.fullName}</h1>
      <button onClick={() => void auth.logout().catch(() => {})}>
        Đóng phiên kiểm thử
      </button>
    </>
  );
}
function renderAuth(path = "/login") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <App>
        <QueryClientProvider client={client}>
          <AuthProvider>
            <MemoryRouter initialEntries={[path]}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<Probe />} />
              </Routes>
            </MemoryRouter>
          </AuthProvider>
        </QueryClientProvider>
      </App>
    </ConfigProvider>,
  );
  return { client, user: userEvent.setup({ pointerEventsCheck: 0 }) };
}
beforeEach(() => {
  h.auth.currentUser = null;
  h.listener = null;
  h.me.mockReset().mockResolvedValue(profile);
  h.login.mockReset().mockResolvedValue(profile);
  h.logout.mockReset().mockResolvedValue(undefined);
  h.persistence.mockReset().mockResolvedValue(undefined);
  h.signIn.mockReset().mockImplementation(async () => {
    h.auth.currentUser = h.user;
    h.listener?.(h.user);
    return { user: h.user };
  });
  h.signOut.mockReset().mockImplementation(async () => {
    h.auth.currentUser = null;
    h.listener?.(null);
  });
});
async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Email"), "admin@example.com");
  await user.type(screen.getByLabelText("Mật khẩu"), "password123");
  await user.click(screen.getByRole("button", { name: "Đăng nhập" }));
}
it("uses session persistence and validates the Firebase token with admin login", async () => {
  const { user } = renderAuth();
  await submit(user);
  expect(
    await screen.findByRole("heading", { name: "Phiên của Quản trị viên" }),
  ).toBeInTheDocument();
  expect(h.persistence).toHaveBeenCalledWith(h.auth, "SESSION");
  expect(h.login).toHaveBeenCalledWith("firebase-token");
});
it("reports invalid Firebase credentials without granting access", async () => {
  h.signIn.mockRejectedValue({ code: "auth/invalid-credential" });
  const { user } = renderAuth();
  await submit(user);
  expect(
    await screen.findByText(
      "Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được kích hoạt.",
    ),
  ).toBeInTheDocument();
  expect(h.login).not.toHaveBeenCalled();
});
it.each([
  { ...profile, role: "DRIVER" },
  { ...profile, status: "INACTIVE" },
])("rejects an unauthorized profile %j", async (result) => {
  h.login.mockResolvedValue(result);
  const { user } = renderAuth();
  await submit(user);
  expect(
    await screen.findByText(
      "Tài khoản chưa được cấp quyền quản trị hoặc đã bị khóa.",
    ),
  ).toBeInTheDocument();
  expect(h.signOut).toHaveBeenCalled();
});
it("restores a session by validating /me instead of calling login again", async () => {
  h.auth.currentUser = h.user;
  renderAuth();
  expect(
    await screen.findByRole("heading", { name: "Phiên của Quản trị viên" }),
  ).toBeInTheDocument();
  expect(h.me).toHaveBeenCalledTimes(1);
  expect(h.login).not.toHaveBeenCalled();
});
it("clears cached personal data and signs out even if backend logout fails", async () => {
  h.auth.currentUser = h.user;
  h.logout.mockRejectedValue(new Error("offline"));
  const { user, client } = renderAuth();
  await screen.findByRole("heading", { name: "Phiên của Quản trị viên" });
  client.setQueryData(["admin", "secret"], { personal: true });
  await user.click(screen.getByRole("button", { name: "Đóng phiên kiểm thử" }));
  await waitFor(() => expect(h.signOut).toHaveBeenCalled());
  expect(client.getQueryData(["admin", "secret"])).toBeUndefined();
  expect(h.auth.currentUser).toBeNull();
});
