"use client";

import { cn } from "@/lib/cn";
import { Button } from "./Button";

type NumericKeypadProps = {
  value: string;
  onChange: (next: string) => void;
  onDone?: () => void;
  allowDecimal?: boolean;
  className?: string;
};

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"] as const;

export function NumericKeypad({
  value,
  onChange,
  onDone,
  allowDecimal = true,
  className,
}: NumericKeypadProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="tabular rounded-[var(--radius)] border border-line bg-surface px-3 py-3 text-right text-[26px] text-ink">
        {value || "0"}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => {
          const disabled = key === "." && !allowDecimal;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              className="min-h-14 rounded-[var(--radius)] border border-line bg-surface text-[20px] text-ink transition-colors duration-150 hover:bg-surface-2 disabled:opacity-40"
              onClick={() => {
                if (key === "⌫") {
                  onChange(value.slice(0, -1));
                  return;
                }
                if (key === "." && value.includes(".")) return;
                onChange(`${value}${key}`);
              }}
            >
              {key}
            </button>
          );
        })}
      </div>
      {onDone ? (
        <Button className="w-full" onClick={onDone}>
          Done
        </Button>
      ) : null}
    </div>
  );
}
