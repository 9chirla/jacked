"use client";

import {
  clearProgressionOverride,
  saveProgressionOverride,
} from "@/app/actions/progress";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { ProgressionSuggestion } from "@/lib/calculations/progression";
import { useState, useTransition } from "react";

type Props = {
  exerciseId: string;
  exerciseName: string;
  suggestion: ProgressionSuggestion;
};

export function ProgressionCard({
  exerciseId,
  exerciseName,
  suggestion,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [customLoad, setCustomLoad] = useState(
    suggestion.loadKg != null ? String(suggestion.loadKg) : "",
  );
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Card className="space-y-3">
      <div>
        <h3 className="font-display text-[18px] font-semibold text-ink">
          {exerciseName}
        </h3>
        <p className="mt-1 text-[14px] text-muted">{suggestion.inputsSummary}</p>
      </div>

      {suggestion.kind === "ask_starting_load" ? (
        <p className="text-[16px] text-ink">Enter a starting load when you log.</p>
      ) : (
        <p className="text-[16px] text-ink">
          Suggest{" "}
          <span className="tabular font-medium">
            {suggestion.loadKg} kg × {suggestion.targetReps.join("/")}
          </span>
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending || suggestion.loadKg == null}
          onClick={() => {
            startTransition(async () => {
              await clearProgressionOverride(exerciseId);
              setMessage("Accepted suggestion (cleared override).");
            });
          }}
        >
          Accept
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const lastLoad = suggestion.loadKg;
              await saveProgressionOverride({
                exerciseId,
                load: lastLoad,
                target_reps_low: suggestion.targetRepsLow,
                target_reps_high: suggestion.targetRepsHigh,
                note: "keep_last",
              });
              setMessage("Kept as override.");
            });
          }}
        >
          Keep last
        </Button>
      </div>

      <div className="flex gap-2">
        <input
          inputMode="decimal"
          value={customLoad}
          onChange={(e) => setCustomLoad(e.target.value)}
          placeholder="Custom kg"
          className="tabular min-h-12 flex-1 rounded-[var(--radius)] border border-line bg-bg px-3"
        />
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            const n = Number(customLoad);
            if (!Number.isFinite(n) || n <= 0) {
              setMessage("Enter a custom load.");
              return;
            }
            startTransition(async () => {
              await saveProgressionOverride({
                exerciseId,
                load: n,
                target_reps_low: suggestion.targetRepsLow,
                target_reps_high: suggestion.targetRepsHigh,
                note: "custom",
              });
              setMessage("Custom override saved.");
            });
          }}
        >
          Custom
        </Button>
      </div>
      {message ? <p className="text-[14px] text-muted">{message}</p> : null}
    </Card>
  );
}
