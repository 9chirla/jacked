"use client";

import { deleteWeighIn, upsertWeighIn } from "@/app/actions/progress";
import { useSyncStatus } from "@/components/pwa/SyncProvider";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { kgToLb, lbToKg, roundMassDisplay } from "@/lib/calculations/units";
import { queueAndSync } from "@/lib/offline/mutate";
import { useState, useTransition } from "react";

type Props = {
  massUnit: "kg" | "lb";
  latestKg: number | null;
  /** YYYY-MM-DD from the server — avoids client/server Date mismatch. */
  defaultDate: string;
};

export function WeighInForm({ massUnit, latestKg, defaultDate }: Props) {
  const { online, refreshPending } = useSyncStatus();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(defaultDate);
  const [display, setDisplay] = useState(() =>
    latestKg == null
      ? ""
      : String(
          massUnit === "lb"
            ? roundMassDisplay(kgToLb(latestKg))
            : roundMassDisplay(latestKg),
        ),
  );
  const [context, setContext] = useState<
    "fasted" | "post_workout" | "evening" | null
  >("fasted");
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  function toKg(value: number) {
    return massUnit === "lb" ? lbToKg(value) : value;
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[14px] text-muted">Weight ({massUnit})</span>
          <input
            inputMode="decimal"
            value={display}
            onChange={(e) => setDisplay(e.target.value)}
            className="tabular min-h-12 w-full rounded-[var(--radius)] border border-line bg-bg px-3 text-[16px]"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[14px] text-muted">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-bg px-3 text-[16px]"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["fasted", "Fasted"],
            ["post_workout", "Post-workout"],
            ["evening", "Evening"],
          ] as const
        ).map(([value, label]) => (
          <Chip
            key={value}
            selected={context === value}
            onClick={() => setContext(value)}
          >
            {label}
          </Chip>
        ))}
      </div>

      <Button
        className="w-full"
        disabled={pending}
        onClick={() => {
          const n = Number(display);
          if (!Number.isFinite(n) || n <= 0) {
            setError("Enter a valid weight.");
            return;
          }
          setError(null);
          startTransition(async () => {
            const kg = toKg(n);
            const payload = {
              weight_kg: kg,
              logged_date: date,
              context,
            };
            const result = await queueAndSync({
              entity: "body_weight_entry",
              op: "upsert",
              payload,
              clientKey: `weigh:${date}`,
              execute: () => upsertWeighIn(payload),
            });
            await refreshPending();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            const delta =
              latestKg == null ? null : roundMassDisplay(kg - latestKg);
            const base =
              delta == null
                ? `Saved ${roundMassDisplay(massUnit === "lb" ? n : kg)} ${massUnit}.`
                : `Saved. ${delta >= 0 ? "+" : ""}${delta} kg vs previous entry.`;
            setConfirm(
              result.queued && !online ? `${base} Queued for sync.` : base,
            );
          });
        }}
      >
        Save weigh-in
      </Button>

      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {confirm ? <p className="text-[14px] text-muted">{confirm}</p> : null}
    </div>
  );
}

export function DeleteWeighInButton({ id }: { id: string }) {
  const { refreshPending } = useSyncStatus();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-[14px] text-muted underline-offset-4 hover:underline"
      onClick={() => {
        if (!window.confirm("Delete this weigh-in?")) return;
        startTransition(async () => {
          await queueAndSync({
            entity: "body_weight_entry",
            op: "delete",
            payload: { id },
            clientKey: `weigh-del:${id}`,
            execute: () => deleteWeighIn(id),
          });
          await refreshPending();
        });
      }}
    >
      Delete
    </button>
  );
}
