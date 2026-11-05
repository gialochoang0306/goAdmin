import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "../theme/ThemeProvider";
import { ThemeSwitcher } from "../components/ThemeSwitcher";

afterEach(() => { localStorage.clear(); document.documentElement.removeAttribute("data-theme"); vi.restoreAllMocks(); });
beforeEach(() => {
  window.matchMedia = vi.fn(query => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: () => true }));
});

it("persists the selected theme without remounting or clearing a form", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const view = render(<ThemeProvider><ThemeSwitcher /><input aria-label="Nội dung đang nhập" defaultValue="Hồ sơ chưa lưu" /></ThemeProvider>);
  await user.click(screen.getByRole("combobox", { name: "Giao diện" }));
  await user.click(screen.getByText("Tối"));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("ptitgo-admin-theme")).toBe("dark");
  expect(screen.getByRole("textbox", { name: "Nội dung đang nhập" })).toHaveValue("Hồ sơ chưa lưu");
  view.unmount();
  render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
  expect(document.documentElement.dataset.theme).toBe("dark");
});

it("follows system changes only when the preference is system", () => {
  let dark = false;
  const listeners = new Set<() => void>();
  vi.spyOn(window, "matchMedia").mockImplementation(query => ({
    matches: dark, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => listeners.add(listener as () => void),
    removeEventListener: (_event: string, listener: EventListenerOrEventListenerObject) => listeners.delete(listener as () => void),
    dispatchEvent: () => true,
  }));
  const view = render(<ThemeProvider><span>Theme</span></ThemeProvider>);
  expect(document.documentElement.dataset.theme).toBe("light");
  act(() => { dark = true; listeners.forEach(fn => fn()); });
  expect(document.documentElement.dataset.theme).toBe("dark");
  view.unmount();
  localStorage.setItem("ptitgo-admin-theme", "light");
  render(<ThemeProvider><span>Theme</span></ThemeProvider>);
  act(() => { listeners.forEach(fn => fn()); });
  expect(document.documentElement.dataset.theme).toBe("light");
});

it("survives unavailable storage and invalid cross-tab preferences", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Blocked"); });
  render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);
  expect(screen.getByRole("combobox", { name: "Giao diện" })).toBeInTheDocument();
  fireEvent(window, new StorageEvent("storage", { key: "ptitgo-admin-theme", newValue: "invalid" }));
  expect(document.documentElement.dataset.theme).toBe("light");
});
