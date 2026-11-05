export function returnPath(state: unknown, fallback: string) {
  const from = state && typeof state === "object" && "from" in state ? state.from : null;
  if (typeof from !== "string" || !from.startsWith("/") || /^\/[/\\]/.test(from) || /[\s\\]/.test(from) || from.startsWith("/login")) return fallback;
  return from;
}

export function returnLabel(path: string) {
  if (/^\/rides\/\d+/.test(path)) return "Quay lại chuyến đi";
  if (path.startsWith("/dashboard")) return "Quay lại tổng quan";
  if (path.startsWith("/driver-documents")) return "Quay lại hàng chờ";
  return "Quay lại danh sách";
}
