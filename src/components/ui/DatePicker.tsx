"use client";

type DatePickerProps = {
  value: string;
  onChange: (next: string) => void;
  label: string;
  max?: string;
  min?: string;
};

export function DatePicker({
  value,
  onChange,
  label,
  max,
  min,
}: DatePickerProps) {
  return (
    <label className="block space-y-1">
      <span className="text-[14px] text-muted">{label}</span>
      <input
        type="date"
        value={value}
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px] text-ink"
      />
    </label>
  );
}
