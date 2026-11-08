import { Input } from "antd";
import { FilterField } from "./FilterField";
import { rideDateRange } from "../lib/format";
import type { useFilters } from "../lib/hooks";

type Filters = ReturnType<typeof useFilters>;
export function listSearch(filters: Filters, prefix = "") {
  const q = filters.read(`${prefix}q`).trim();
  const from = filters.read(`${prefix}from`);
  const to = filters.read(`${prefix}to`);
  const range = rideDateRange(from, to);
  return { q, from, to, error: range.error, params: { q, createdFrom: range.createdFrom, createdTo: range.createdTo } };
}

export function SearchDateFields({ filters, prefix = "", label, placeholder, disabled = false }: {
  filters: Filters; prefix?: string; label: string; placeholder: string; disabled?: boolean;
}) {
  const { q, from, to } = listSearch(filters, prefix);
  return <>
    <FilterField label={label} search><Input.Search key={q} defaultValue={q} aria-label={label}
      placeholder={placeholder} enterButton="Tìm" maxLength={200} disabled={disabled}
      onSearch={value => filters.update({ [`${prefix}q`]: value.trim() })} /></FilterField>
    <FilterField label="Từ ngày tạo (VN)"><Input type="date" aria-label={`${label} · Từ ngày`} value={from} disabled={disabled}
      onChange={event => filters.update({ [`${prefix}from`]: event.target.value })} /></FilterField>
    <FilterField label="Đến ngày tạo (VN)"><Input type="date" aria-label={`${label} · Đến ngày`} value={to} min={from || undefined} disabled={disabled}
      onChange={event => filters.update({ [`${prefix}to`]: event.target.value })} /></FilterField>
  </>;
}
