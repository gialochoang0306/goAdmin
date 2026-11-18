import { DatePicker } from "antd";
import dayjs from "dayjs";
import { currentDateVN, rideDateRange } from "../lib/format";

export function CreationDateInput({
  id, label, value, min, max = currentDateVN(), disabled, invalid, onChange,
}: {
  id?: string;
  label: string;
  value: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const selected = value && !rideDateRange(value, "").error ? dayjs(value) : null;
  const minimum = min && !rideDateRange(min, "").error ? dayjs(min) : undefined;
  return <DatePicker
    id={id}
    aria-label={label}
    aria-invalid={!!invalid}
    format="DD/MM/YYYY"
    placeholder="dd/mm/yyyy"
    value={selected}
    minDate={minimum}
    maxDate={dayjs(max)}
    disabled={disabled}
    status={invalid ? "error" : undefined}
    onChange={date => onChange(date?.format("YYYY-MM-DD") ?? "")}
  />;
}
