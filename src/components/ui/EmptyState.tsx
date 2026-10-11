import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-[var(--radius-lg)] border border-dashed border-line bg-surface/70 p-5",
        className,
      )}
    >
      <div>
        <h2 className="font-display text-[20px] font-semibold tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-1 max-w-prose text-[16px] text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
