"use client";

import { Button } from "./Button";

type RestTimerProps = {
  /** Remaining seconds — parent owns the ticking clock. */
  seconds: number;
  running: boolean;
  onSkip: () => void;
  onAdjust: (delta: number) => void;
};

function format(total: number) {
  const safe = Math.max(0, total);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Visual rest timer. Parent decrements `seconds` while `running` is true. */
export function RestTimer({
  seconds,
  running,
  onSkip,
  onAdjust,
}: RestTimerProps) {
  return (
    <div
      className="rounded-[var(--radius-lg)] border border-line bg-surface p-4"
      aria-live="polite"
      data-running={running ? "true" : "false"}
    >
      <p className="text-[12px] uppercase tracking-[0.04em] text-muted">
        Rest{running ? "" : " (paused)"}
      </p>
      <p className="tabular mt-2 text-[44px] font-medium leading-none text-ink">
        {format(seconds)}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onAdjust(-15)}>
          −15s
        </Button>
        <Button variant="secondary" onClick={() => onAdjust(15)}>
          +15s
        </Button>
        <Button variant="ghost" onClick={onSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}
