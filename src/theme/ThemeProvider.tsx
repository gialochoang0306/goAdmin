import { createContext, useContext, useEffect, useLayoutEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { ConfigProvider, theme } from "antd";
import viVN from "antd/locale/vi_VN";

type Preference = "light" | "dark" | "system";
const key = "ptitgo-admin-theme";
const mediaQuery = "(prefers-color-scheme: dark)";
const isPreference = (value: unknown): value is Preference => value === "light" || value === "dark" || value === "system";
const readPreference = (): Preference => {
  try { const value = localStorage.getItem(key); return isPreference(value) ? value : "system"; }
  catch { return "system"; }
};
const subscribeSystem = (notify: () => void) => {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const systemIsDark = () => window.matchMedia(mediaQuery).matches;
const ThemeContext = createContext<{ preference: Preference; setPreference: (value: Preference) => void } | null>(null);
export const useTheme = () => useContext(ThemeContext);

// Keep ConfigProvider mounted so open forms retain state when switching themes.
// https://ant.design/docs/react/customize-theme/#switch-themes-dynamically
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readPreference);
  const systemDark = useSyncExternalStore(subscribeSystem, systemIsDark, () => false);
  const dark = preference === "dark" || (preference === "system" && systemDark);
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#11151c" : "#f5f6f8");
  }, [dark]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setPreferenceState(isPreference(event.newValue) ? event.newValue : "system");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const value = useMemo(() => ({ preference, setPreference: (next: Preference) => {
    setPreferenceState(next);
    try { localStorage.setItem(key, next); } catch { /* Use in-memory preference when storage is blocked. */ }
  } }), [preference]);
  return <ThemeContext value={value}>
    <ConfigProvider locale={viVN} theme={{
      algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: dark ? "#b84d60" : "#800000", colorLink: dark ? "#f2abb5" : "#800000",
        colorBgLayout: dark ? "#11151c" : "#f5f6f8", colorBgContainer: dark ? "#1a2029" : "#ffffff",
        colorBgElevated: dark ? "#222a35" : "#ffffff", colorText: dark ? "#eef1f6" : "#202936",
        colorTextSecondary: dark ? "#aab4c3" : "#5e6979", colorBorder: dark ? "#6a778b" : "#8792a3",
        colorBorderSecondary: dark ? "#303b49" : "#e5e8ed", borderRadius: 8, fontSize: 14, controlHeight: 36,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      },
    }}>{children}</ConfigProvider>
  </ThemeContext>;
}
