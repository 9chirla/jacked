import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type StatTileProps = {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
};

export function StatTile({ label, value, hint, className }: StatTileProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-line bg-surface p-3",
        className,
      )}
    >
      <p className="text-[12px] uppercase tracking-[0.04em] text-muted">
        {label}
      </p>
      <p className="tabular mt-1 text-[26px] font-medium leading-none text-ink">
        {value}
      </p>
      {hint ? <p className="mt-2 text-[14px] text-muted">{hint}</p> : null}
    </div>
  );
}
