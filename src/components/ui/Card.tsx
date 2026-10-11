import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[0_1px_0_rgba(18,22,15,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
