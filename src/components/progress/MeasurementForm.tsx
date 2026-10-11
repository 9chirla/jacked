"use client";

import { upsertMeasurement } from "@/app/actions/progress";
import { Button } from "@/components/ui/Button";
import { cmToIn, inToCm, roundLengthDisplay } from "@/lib/calculations/units";
import { useState, useTransition } from "react";

const SITES = [
  "waist",
  "chest",
  "hips",
  "neck",
  "left_arm",
  "right_arm",
  "left_thigh",
  "right_thigh",
] as const;

type Props = {
  lengthUnit: "cm" | "in";
  /** YYYY-MM-DD from the server — avoids client/server Date mismatch. */
  defaultDate: string;
};

export function MeasurementForm({ lengthUnit, defaultDate }: Props) {
  const [pending, startTransition] = useTransition();
  const [site, setSite] = useState<(typeof SITES)[number]>("waist");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-[14px] text-muted">Site</span>
        <select
          value={site}
          onChange={(e) => setSite(e.target.value as (typeof SITES)[number])}
          className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-bg px-3 text-[16px]"
        >
          {SITES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-[14px] text-muted">Value ({lengthUnit})</span>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="tabular min-h-12 w-full rounded-[var(--radius)] border border-line bg-bg px-3"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[14px] text-muted">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-bg px-3"
          />
        </label>
      </div>
      <Button
        disabled={pending}
        onClick={() => {
          const n = Number(value);
          if (!Number.isFinite(n) || n <= 0) {
            setError("Enter a valid measurement.");
            return;
          }
          setError(null);
          startTransition(async () => {
            const cm = lengthUnit === "in" ? inToCm(n) : n;
            const result = await upsertMeasurement({
              site,
              value_cm: cm,
              logged_date: date,
            });
            if (!result.ok) setError(result.error);
            else setValue("");
          });
        }}
      >
        Save measurement
      </Button>
      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {lengthUnit === "in" ? (
        <p className="text-[12px] text-muted">
          Stored as cm ({roundLengthDisplay(inToCm(Number(value) || 0))} cm
          preview). Display uses inches.
        </p>
      ) : (
        <p className="text-[12px] text-muted">
          Example display: {roundLengthDisplay(cmToIn(80))} in = 80 cm.
        </p>
      )}
    </div>
  );
}
