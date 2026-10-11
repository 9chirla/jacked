"use client";

import dynamic from "next/dynamic";
import type { RollingPoint } from "@/lib/calculations/rolling-average";
import type { ExerciseHistoryPoint } from "@/lib/analytics/types";

const WeightTrendChartInner = dynamic(
  () =>
    import("@/components/progress/WeightTrendChart").then(
      (m) => m.WeightTrendChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[220px] w-full rounded-[var(--radius)] border border-line bg-surface"
        aria-hidden
      />
    ),
  },
);

const ExerciseHistoryChartInner = dynamic(
  () =>
    import("@/components/analytics/ExerciseHistoryChart").then(
      (m) => m.ExerciseHistoryChart,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-40 w-full rounded-[var(--radius)] border border-line bg-surface"
        aria-hidden
      />
    ),
  },
);

export function ClientWeightTrendChart(props: {
  points: RollingPoint[];
  unitLabel: string;
}) {
  return <WeightTrendChartInner {...props} />;
}

export function ClientExerciseHistoryChart(props: {
  points: ExerciseHistoryPoint[];
  unitLabel: string;
}) {
  return <ExerciseHistoryChartInner {...props} />;
}
