"use client";

import type { ExerciseHistoryPoint } from "@/lib/analytics/types";
import { useEffect, useState } from "react";

type Props = {
  points: ExerciseHistoryPoint[];
  unitLabel: string;
};

function ChartSvg({ points, unitLabel }: Props) {
  const width = 320;
  const height = 160;
  const pad = 18;
  const loads = points.map((p) => p.topLoad);
  const e1rms = points
    .map((p) => p.e1rm)
    .filter((v): v is number => v != null);
  const min = Math.min(...loads, ...(e1rms.length ? e1rms : loads));
  const max = Math.max(...loads, ...(e1rms.length ? e1rms : loads));
  const span = max - min || 1;

  const xy = (index: number, value: number) => {
    const x =
      pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return { x, y };
  };

  const e1rmCoords = points
    .map((p, i) => (p.e1rm != null ? xy(i, p.e1rm) : null))
    .filter((c): c is { x: number; y: number } => c != null);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full rounded-[var(--radius)] border border-line bg-surface"
      role="img"
      aria-label="Exercise load history"
    >
      {e1rmCoords.length > 1 ? (
        <polyline
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
          strokeDasharray="4 3"
          points={e1rmCoords.map((c) => `${c.x},${c.y}`).join(" ")}
        />
      ) : null}
      {points.map((p, i) => {
        const { x, y } = xy(i, p.topLoad);
        return (
          <circle
            key={`${p.sessionId}-${p.date}`}
            cx={x}
            cy={y}
            r={3.5}
            fill="var(--accent)"
            stroke="var(--accent-ink)"
            aria-label={`${p.date}: ${p.topLoad} ${unitLabel} × ${p.topReps}`}
          />
        );
      })}
    </svg>
  );
}

export function ExerciseHistoryChart({ points, unitLabel }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        className="h-40 animate-pulse rounded-[var(--radius)] border border-line bg-surface"
        aria-hidden
      />
    );
  }

  if (points.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-line p-4 text-[14px] text-muted">
        Log this exercise twice to see a trend.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <ChartSvg points={points} unitLabel={unitLabel} />
      <p className="text-[12px] text-muted">
        Solid points = top working load. Dashed line = Epley e1RM (derived).
      </p>
      <details>
        <summary className="cursor-pointer text-[14px] text-muted">
          View as table
        </summary>
        <table className="mt-2 w-full text-left text-[14px]">
          <thead>
            <tr className="text-muted">
              <th className="py-1 font-normal">Date</th>
              <th className="py-1 font-normal">Load × reps</th>
              <th className="py-1 font-normal">e1RM</th>
              <th className="py-1 font-normal">Volume</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.sessionId} className="tabular text-ink">
                <td className="py-1">{p.date}</td>
                <td className="py-1">
                  {p.topLoad} × {p.topReps}
                </td>
                <td className="py-1">
                  {p.e1rm != null ? Math.round(p.e1rm * 10) / 10 : "—"}
                </td>
                <td className="py-1">{Math.round(p.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
