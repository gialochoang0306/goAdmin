import { Input } from "antd";
import { FilterField } from "./FilterField";
import { CreationDateInput } from "./CreationDateInput";
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
  const { q, from, to, error } = listSearch(filters, prefix);
  return <>
    <FilterField label={label} search><Input.Search key={q} defaultValue={q} aria-label={label}
      placeholder={placeholder} enterButton="Tìm" maxLength={200} disabled={disabled}
      onSearch={value => filters.update({ [`${prefix}q`]: value.trim() })} /></FilterField>
    <FilterField label="Từ ngày tạo (VN)"><CreationDateInput label={`${label} · Từ ngày`} value={from} invalid={!!error} disabled={disabled}
      onChange={value => filters.update({ [`${prefix}from`]: value })} /></FilterField>
    <FilterField label="Đến ngày tạo (VN)"><CreationDateInput label={`${label} · Đến ngày`} value={to} min={from} invalid={!!error} disabled={disabled}
      onChange={value => filters.update({ [`${prefix}to`]: value })} /></FilterField>
  </>;
}
