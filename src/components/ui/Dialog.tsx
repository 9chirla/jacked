"use client";

import { cn } from "@/lib/cn";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Button } from "./Button";

type DialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
};

export function Dialog({
  open,
  title,
  children,
  onClose,
  className,
}: DialogProps) {
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
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-[rgba(12,16,10,0.45)]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative z-10 w-full max-w-md rounded-[var(--radius-lg)] border border-line bg-surface p-5 shadow-lg motion-settle",
          className,
        )}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            {title}
          </h2>
          <Button variant="ghost" className="min-h-12 px-3" onClick={onClose}>
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
