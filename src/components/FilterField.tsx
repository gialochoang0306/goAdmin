import type { ReactNode } from "react";
export function FilterField({ label, children, search = false }: { label: string; children: ReactNode; search?: boolean }) {
  return <div className={`filter-field${search ? " search-field" : ""}`}><span>{label}</span>{children}</div>;
}
