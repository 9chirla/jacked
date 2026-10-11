import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export function Chip({
  selected = false,
  className,
  type = "button",
  ...props
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-12 items-center rounded-[var(--radius-sm)] border px-3 text-[14px] transition-colors duration-150",
        selected
          ? "border-accent-ink/20 bg-accent text-accent-ink"
          : "border-line bg-surface text-ink hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}
