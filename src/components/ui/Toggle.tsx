"use client";

import { cn } from "@/lib/cn";

type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
};

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: ToggleProps) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-2">
      <span>
        <span className="block text-[16px] text-ink">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[14px] text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full border transition-colors duration-150",
          checked
            ? "border-accent-ink/20 bg-accent"
            : "border-line bg-surface-2",
          disabled && "opacity-50",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-accent-ink transition-transform duration-150",
            checked && "translate-x-6",
          )}
        />
      </button>
    </label>
  );
}
