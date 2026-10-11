"use client";

type UnitInputProps = {
  label: string;
  value: string;
  unit: string;
  onChange: (next: string) => void;
  inputMode?: "decimal" | "numeric";
};

export function UnitInput({
  label,
  value,
  unit,
  onChange,
  inputMode = "decimal",
}: UnitInputProps) {
  return (
    <label className="block space-y-1">
      <span className="text-[14px] text-muted">{label}</span>
      <span className="flex min-h-12 items-stretch overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
        <input
          value={value}
          inputMode={inputMode}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
          className="tabular min-w-0 flex-1 bg-transparent px-3 text-[16px] text-ink outline-none"
        />
        <span className="inline-flex items-center border-l border-line bg-bg px-3 text-[14px] text-muted">
          {unit}
        </span>
      </span>
    </label>
  );
}
