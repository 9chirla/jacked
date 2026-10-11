import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export function IconButton({
  label,
  children,
  className,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] text-ink transition-colors duration-150 hover:bg-surface-2 active:bg-line/40 disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
