import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink hover:brightness-95 active:brightness-90",
  secondary:
    "bg-surface text-ink border border-line hover:bg-surface-2 active:bg-line/40",
  ghost: "bg-transparent text-ink hover:bg-surface-2 active:bg-line/30",
  destructive:
    "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-[var(--radius)] px-4 text-[16px] font-medium transition-[filter,background-color,transform] duration-150 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
