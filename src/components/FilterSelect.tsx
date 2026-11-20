import { Select } from "antd";
import type { SelectProps } from "antd";

export type FilterOption = { value: string; label: string };

const ALL_VALUE = "__all__";

type CommonProps = {
  /** Nhãn của lựa chọn "tất cả", phải khớp ngữ cảnh: "Tất cả trạng thái", "Tất cả loại xe"… */
  allLabel: string;
  options: readonly FilterOption[];
  placeholder?: string;
};

type SingleProps = CommonProps & {
  value?: string | null;
  onChange: (value: string | undefined) => void;
} & Omit<SelectProps<string>, "options" | "value" | "onChange" | "placeholder" | "mode" | "allowClear">;

/**
 * Select lọc dùng chung: luôn có lựa chọn "tất cả" đứng đầu danh sách, chọn nó
 * sẽ xoá tham số lọc thay vì để người dùng phải tìm nút xoá.
 */
export function FilterSelect({ value, onChange, options, allLabel, placeholder, ...rest }: SingleProps) {
  return (
    <Select<string>
      {...rest}
      allowClear
      placeholder={placeholder ?? allLabel}
      value={value ?? ""}
      options={[{ value: "", label: allLabel }, ...options]}
      onChange={(next) => onChange(next === "" ? undefined : next)}
    />
  );
}

type MultiProps = CommonProps & {
  value?: readonly string[];
  onChange: (value: string[] | undefined) => void;
} & Omit<SelectProps<string[]>, "options" | "value" | "onChange" | "placeholder" | "mode" | "allowClear">;

/** Bản nhiều lựa chọn: chọn "tất cả" sẽ bỏ hết điều kiện lọc. */
export function FilterMultiSelect({ value, onChange, options, allLabel, placeholder, ...rest }: MultiProps) {
  return (
    <Select<string[]>
      {...rest}
      allowClear
      mode="multiple"
      placeholder={placeholder ?? allLabel}
      value={[...(value ?? [])]}
      options={[{ value: ALL_VALUE, label: allLabel }, ...options]}
      onChange={(next) => onChange(next.includes(ALL_VALUE) || next.length === 0 ? undefined : next)}
    />
  );
}
