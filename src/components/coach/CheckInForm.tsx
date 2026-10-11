"use client";

import { Button } from "@/components/ui/Button";
import { useState, useTransition } from "react";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

type Props = {
  defaultDate: string;
  initial: {
    fatigue: number;
    soreness: number;
    sleep: number | null;
    discomfortText: string | null;
  } | null;
  upsertAction: (input: unknown) => Promise<ActionResult>;
};

function ScoreRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-[14px] text-muted">
        {label} ({value}/5)
      </legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`min-h-11 min-w-11 rounded-[var(--radius)] border text-[16px] ${
              value === n
                ? "border-accent-ink/20 bg-accent text-accent-ink"
                : "border-line bg-surface text-ink"
            }`}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function CheckInForm({ defaultDate, initial, upsertAction }: Props) {
  const [fatigue, setFatigue] = useState(initial?.fatigue ?? 3);
  const [soreness, setSoreness] = useState(initial?.soreness ?? 3);
  const [sleep, setSleep] = useState(initial?.sleep ?? 3);
  const [discomfort, setDiscomfort] = useState(initial?.discomfortText ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await upsertAction({
            logged_date: defaultDate,
            fatigue,
            soreness,
            sleep,
            discomfort_text: discomfort.trim() || null,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSaved(true);
        });
      }}
    >
      <ScoreRow label="Fatigue" value={fatigue} onChange={setFatigue} />
      <ScoreRow label="Soreness" value={soreness} onChange={setSoreness} />
      <ScoreRow label="Sleep" value={sleep} onChange={setSleep} />
      <label className="block space-y-1">
        <span className="text-[14px] text-muted">
          Discomfort note (optional, stored verbatim)
        </span>
        <textarea
          value={discomfort}
          onChange={(e) => setDiscomfort(e.target.value)}
          rows={2}
          maxLength={500}
          className="w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-2 text-[16px]"
          placeholder="Optional. Not diagnosed or classified."
        />
      </label>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : initial ? "Update check-in" : "Save check-in"}
      </Button>
      {saved ? (
        <p className="text-[14px] text-muted">Saved for {defaultDate}.</p>
      ) : null}
      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
