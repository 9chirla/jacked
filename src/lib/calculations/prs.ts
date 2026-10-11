/**
 * Measured PR (§10.4): highest working-set load at a given rep count,
 * per exercise, per user. Detection runs on save, not on render.
 */

export type MeasuredPrCandidate = {
  id: string;
  kind: string;
  completed: boolean;
  load: number | null;
  reps: number | null;
};

export type PreviousMeasuredPr = {
  id: string;
  load: number;
};

export type MeasuredPrResult = {
  isPr: boolean;
  demoteId: string | null;
};

export function evaluateMeasuredPr(
  candidate: MeasuredPrCandidate,
  previousBest: PreviousMeasuredPr | null,
): MeasuredPrResult {
  if (
    !candidate.completed ||
    candidate.kind !== "working" ||
    candidate.load == null ||
    candidate.reps == null ||
    candidate.load <= 0 ||
    candidate.reps <= 0
  ) {
    return { isPr: false, demoteId: null };
  }

  if (previousBest == null || candidate.load > previousBest.load) {
    return {
      isPr: true,
      demoteId:
        previousBest && previousBest.id !== candidate.id
          ? previousBest.id
          : null,
    };
  }

  // Tie or lower: keep existing holder; candidate is not a PR
  return { isPr: false, demoteId: null };
}

/** After deleting a PR holder, promote the next-best working set at same reps. */
export function nextMeasuredPrHolder(
  remaining: Array<{ id: string; load: number | null; kind: string; completed: boolean }>,
): string | null {
  const eligible = remaining.filter(
    (s) =>
      s.completed &&
      s.kind === "working" &&
      s.load != null &&
      s.load > 0,
  );
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => (b.load as number) - (a.load as number));
  return eligible[0]!.id;
}
