import { cn } from "@/lib/cn";
import { Check } from "lucide-react";

type SetRowProps = {
  setNumber: number;
  kind: "warmup" | "working" | "drop" | "failure" | "isometric" | "amrap";
  loadLabel: string;
  repsLabel: string;
  completed?: boolean;
  onActivate?: () => void;
  className?: string;
};

export function SetRow({
  setNumber,
  kind,
  loadLabel,
  repsLabel,
  completed = false,
  onActivate,
  className,
}: SetRowProps) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        "grid w-full grid-cols-[2rem_4.5rem_1fr_1fr_2rem] items-center gap-2 rounded-[var(--radius)] border border-line bg-surface px-2 py-3 text-left transition-colors duration-150 hover:bg-surface-2",
        className,
      )}
    >
      <span className="tabular text-[14px] text-muted">{setNumber}</span>
      <span className="rounded-[var(--radius-sm)] bg-bg px-2 py-1 text-[12px] text-muted">
        {kind}
      </span>
      <span className="tabular text-[16px] text-ink">{loadLabel}</span>
      <span className="tabular text-[16px] text-ink">{repsLabel}</span>
      <span
        aria-label={completed ? "Completed" : "Incomplete"}
        className={cn(
          "inline-flex h-6 w-6 items-center justify-center rounded-full border text-[12px]",
          completed
            ? "border-accent-ink/20 bg-accent text-accent-ink"
            : "border-line text-muted",
        )}
      >
        {completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
