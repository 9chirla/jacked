"use client";

import type { RollingPoint } from "@/lib/calculations/rolling-average";
import { useEffect, useState } from "react";

type Props = {
  points: RollingPoint[];
  unitLabel: string;
};

function ChartSvg({
  points,
  unitLabel,
}: {
  points: RollingPoint[];
  unitLabel: string;
}) {
  const width = 320;
  const height = 160;
  const pad = 18;
  const ys = points.map((p) => p.weightKg);
  const avgYs = points
    .map((p) => p.centredAvgKg)
    .filter((v): v is number => v != null);
  const min = Math.min(...ys, ...(avgYs.length ? avgYs : ys));
  const max = Math.max(...ys, ...(avgYs.length ? avgYs : ys));
  const span = max - min || 1;

  const xy = (index: number, value: number) => {
    const x =
      pad + (index * (width - pad * 2)) / Math.max(points.length - 1, 1);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return { x, y };
  };

  const avgCoords = points
    .map((p, i) =>
      p.centredAvgKg != null && p.centredStatus === "full"
        ? xy(i, p.centredAvgKg)
        : null,
    )
    .filter((c): c is { x: number; y: number } => c != null);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full rounded-[var(--radius)] border border-line bg-surface"
      role="img"
      aria-label="Body weight trend"
    >
      {avgCoords.length > 1 ? (
        <polyline
          fill="none"
          stroke="var(--muted)"
          strokeWidth="2"
          strokeDasharray="4 3"
          points={avgCoords.map((c) => `${c.x},${c.y}`).join(" ")}
        />
      ) : null}
      {points.map((p, i) => {
        const { x, y } = xy(i, p.weightKg);
        return (
          <circle
            key={p.date}
            cx={x}
            cy={y}
            r={3.5}
            fill="var(--accent)"
            stroke="var(--accent-ink)"
            aria-label={`${p.date}: ${p.weightKg} ${unitLabel}`}
          />
        );
      })}
    </svg>
  );
}

/**
 * Fully client-mounted — SSR/client SVG + aria mismatches on Next 16 Flight
 * were cascading into `chunk.reason.enqueueModel is not a function`.
 */
export function WeightTrendChart({ points, unitLabel }: Props) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div
        className="h-[220px] w-full rounded-[var(--radius)] border border-line bg-surface"
        aria-hidden
      />
    );
  }

  if (points.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-line p-4 text-[14px] text-muted">
        Add your first weigh-in to start the chart. Only stored values are
        plotted — never invented points.
      </div>
    );
  }

  return (
    <figure>
      <figcaption className="mb-2 text-[14px] text-muted">
        Body weight ({unitLabel}) — points are stored entries; line is 7-day
        average (derived)
      </figcaption>
      <ChartSvg points={points} unitLabel={unitLabel} />
      <p className="mt-2 text-[12px] text-muted">
        Gaps stay gaps. Dashed line = full 7-day centred average only.
      </p>
      <details className="mt-2">
        <summary className="min-h-12 cursor-pointer text-[14px] text-muted">
          View as table
        </summary>
        <table className="mt-2 w-full text-left text-[14px]">
          <thead>
            <tr className="text-muted">
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">{unitLabel}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.date} className="border-t border-line">
                <td className="py-1">{p.date}</td>
                <td className="tabular py-1">{p.weightKg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
