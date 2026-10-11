"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { useEffect } from "react";

type BottomSheetProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export function BottomSheet({
  open,
  title,
  children,
  onClose,
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="Dismiss sheet"
        className="absolute inset-0 bg-[rgba(12,16,10,0.4)]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full max-w-lg rounded-t-[var(--radius-lg)] border border-b-0 border-line bg-surface p-5 pb-[calc(1.25rem+var(--safe-bottom))] shadow-xl motion-settle",
          className,
        )}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="font-display text-[20px] font-semibold text-ink">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
