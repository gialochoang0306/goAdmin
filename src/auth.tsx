import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { api, ApiError, configureAuth, errorMessage } from "./lib/api";
import { firebaseAuth, configError } from "./lib/firebase";
import type { Profile } from "./types";

type AuthState = {
  profile: Profile | null;
  loading: boolean;
  configError: string | null;
  sessionError: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
function assertAdmin(profile: Profile) {
  if (profile.role !== "ADMIN" || profile.status !== "ACTIVE")
    throw new ApiError(
      "Tài khoản chưa được cấp quyền quản trị hoặc đã bị khóa.",
      "FORBIDDEN",
      403,
    );
  return profile;
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(!!firebaseAuth);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const signingIn = useRef(false);
  const generation = useRef(0);
  const client = useQueryClient();
  const clearSession = useCallback(() => {
    generation.current++;
    setProfile(null);
    client.clear();
  }, [client]);
  useEffect(() => {
    let mounted = true;
    configureAuth(
      async (refresh) => firebaseAuth?.currentUser?.getIdToken(refresh) ?? null,
      () => {
        clearSession();
        setSessionError(
          "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.",
        );
        if (firebaseAuth) void signOut(firebaseAuth).catch(() => {});
      },
    );
    if (!firebaseAuth) return;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!mounted || signingIn.current) return;
      const current = ++generation.current;
      if (!user) {
        setProfile(null);
        client.clear();
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const result = assertAdmin(await api.me());
        if (mounted && generation.current === current) setProfile(result);
      } catch (error) {
        if (mounted && generation.current === current) {
          setSessionError(errorMessage(error));
          setProfile(null);
          client.clear();
          await signOut(firebaseAuth!);
        }
      } finally {
        if (mounted && generation.current === current) setLoading(false);
      }
    });
    return () => {
      mounted = false;
      unsubscribe();
      configureAuth(
        async () => null,
        () => {},
      );
    };
  }, [clearSession, client]);

  const login = async (email: string, password: string) => {
    if (!firebaseAuth) throw new Error(configError!);
    signingIn.current = true;
    generation.current++;
    setSessionError(null);
    try {
      await setPersistence(firebaseAuth, browserSessionPersistence);
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password,
      );
      const result = assertAdmin(
        await api.login(await credential.user.getIdToken()),
      );
      client.clear();
      setProfile(result);
      setLoading(false);
    } catch (error) {
      setProfile(null);
      await signOut(firebaseAuth).catch(() => {});
      const code = (error as { code?: string }).code;
      if (code?.startsWith("auth/"))
        throw new Error(
          code === "auth/too-many-requests"
            ? "Có quá nhiều lần thử. Vui lòng thử lại sau."
            : code === "auth/network-request-failed"
              ? "Không kết nối được Firebase. Kiểm tra kết nối và thử lại."
              : "Email hoặc mật khẩu không đúng, hoặc tài khoản chưa được kích hoạt.",
        );
      throw error;
    } finally {
      signingIn.current = false;
      setLoading(false);
    }
  };
  const logout = async () => {
    try {
      let installationId = sessionStorage.getItem("admin-installation-id");
      if (!installationId) {
        installationId = crypto.randomUUID();
        sessionStorage.setItem("admin-installation-id", installationId);
      }
      await api.logout(installationId);
    } finally {
      clearSession();
      if (firebaseAuth) await signOut(firebaseAuth);
    }
  };
  return (
    <AuthContext.Provider
      value={{ profile, loading, configError, sessionError, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("AuthProvider is required");
  return context;
}
