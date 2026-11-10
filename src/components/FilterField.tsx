import type { ReactNode } from "react";
export function FilterField({ label, children, search = false, htmlFor }: { label: string; children: ReactNode; search?: boolean; htmlFor?: string }) {
  return (
    <div className={`filter-field${search ? " search-field" : ""}`}>
      {htmlFor ? <label className="filter-label" htmlFor={htmlFor}>{label}</label> : <span className="filter-label">{label}</span>}
      {children}
    </div>
  );
}
