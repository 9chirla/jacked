"use client";

import { cn } from "@/lib/cn";

type ToastProps = {
  message: string;
  tone?: "neutral" | "success" | "danger";
  className?: string;
};

export function Toast({
  message,
  tone = "neutral",
  className,
}: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "rounded-[var(--radius)] border px-4 py-3 text-[14px] shadow-sm motion-settle",
        tone === "success" && "border-success/40 bg-success/15 text-ink",
        tone === "danger" && "border-danger/40 bg-danger/15 text-ink",
        tone === "neutral" && "border-line bg-surface text-ink",
        className,
      )}
    >
      {message}
    </div>
  );
}
