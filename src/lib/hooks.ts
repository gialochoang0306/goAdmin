import { useMutation, useQueryClient } from "@tanstack/react-query";
import { App } from "antd";
import { useSearchParams } from "react-router-dom";
import { errorMessage } from "./api";
import type { Params } from "../types";

export function useFilters() {
  const [search, setSearch] = useSearchParams();
  const read = (key: string, fallback = "") => search.get(key) ?? fallback;
  const rawPage = Number(read("page", "0"));
  const page = Number.isSafeInteger(rawPage) && rawPage >= 0 ? rawPage : 0;
  const rawSize = Number(read("size", "20"));
  const size = [20, 50, 100].includes(rawSize) ? rawSize : 20;
  const update = (values: Params, resetPage = true) => {
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      if (resetPage) next.delete("page");
      Object.entries(values).forEach(([key, value]) => {
        if (value == null || value === "") next.delete(key);
        else next.set(key, String(value));
      });
      if (values.size != null && Number(values.size) !== size) next.delete("page");
      return next;
    });
  };
  const reset = () => setSearch(previous => {
    const next = new URLSearchParams();
    if (previous.has("size")) next.set("size", String(size));
    if (previous.has("tab")) next.set("tab", previous.get("tab")!);
    return next;
  });
  return { read, page, size, update, reset, params: { page, size } };
}
export function useAction<T>(
  action: (values: T) => Promise<unknown>,
  onSuccess?: (values: T) => void,
  successMessage?: string | ((values: T) => string),
) {
  const client = useQueryClient();
  const { message } = App.useApp();
  return useMutation({
    mutationFn: action,
    onSuccess: async (_data, values) => {
      await client.invalidateQueries({ queryKey: ["admin"] });
      void message.success(typeof successMessage === "function" ? successMessage(values) : successMessage ?? "Đã cập nhật thành công.");
      onSuccess?.(values);
    },
    onError: (error) => {
      void message.error(errorMessage(error));
    },
    retry: false,
  });
}
