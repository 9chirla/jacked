export type WorkingSetPerf = {
  load: number | null;
  reps: number | null;
};

export type ProgressionInput = {
  exerciseName: string;
  /** Prior completed sessions newest-first; each is working sets in set order. */
  recentSessions: WorkingSetPerf[][];
  repRangeLow: number;
  repRangeHigh: number;
  /** Smallest plate/dumbbell step (kg). */
  incrementKg: number;
  /** Days since last session for this movement; null if never. */
  daysSinceLast: number | null;
  /** Optional check-in modulation. */
  fatigue?: number | null;
  soreness?: number | null;
  /** Stored override wins when present. */
  override?: {
    load: number | null;
    targetRepsLow: number | null;
    targetRepsHigh: number | null;
  } | null;
};

export type ProgressionSuggestion = {
  kind: "suggest" | "ask_starting_load" | "override";
  loadKg: number | null;
  targetReps: number[];
  targetRepsLow: number;
  targetRepsHigh: number;
  rule: string;
  explanation: string;
  inputsSummary: string;
};

/** Climb missed sets by 1 toward the session target (8/7/6 → 8/8/7). */
function bumpTargets(
  achieved: number[],
  target: number,
  rangeHigh: number,
): number[] {
  const cap = Math.min(rangeHigh, target);
  return achieved.map((reps) => {
    if (reps >= cap) return cap;
    return Math.min(cap, reps + 1);
  });
}

function formatSets(sets: WorkingSetPerf[]): string {
  const load = sets.find((s) => s.load != null)?.load;
  const reps = sets.map((s) => (s.reps == null ? "—" : String(s.reps))).join("/");
  return `${load ?? "—"} kg × ${reps}`;
}

/**
 * Double progression with 2-for-2 (§10.6). Pure function over stored history only.
 */
export function suggestProgression(
  input: ProgressionInput,
): ProgressionSuggestion {
  const {
    exerciseName,
    recentSessions,
    repRangeLow,
    repRangeHigh,
    incrementKg,
    daysSinceLast,
    fatigue,
    soreness,
    override,
  } = input;

  if (override?.load != null) {
    const low = override.targetRepsLow ?? repRangeLow;
    const high = override.targetRepsHigh ?? repRangeHigh;
    return {
      kind: "override",
      loadKg: override.load,
      targetReps: Array.from({ length: 3 }, () => low),
      targetRepsLow: low,
      targetRepsHigh: high,
      rule: "progression_override",
      explanation: "Using your saved override for this exercise.",
      inputsSummary: `${exerciseName} — override ${override.load} kg, target ${low}–${high}`,
    };
  }

  if (recentSessions.length === 0) {
    return {
      kind: "ask_starting_load",
      loadKg: null,
      targetReps: [repRangeLow, repRangeLow, repRangeLow],
      targetRepsLow: repRangeLow,
      targetRepsHigh: repRangeHigh,
      rule: "double_progression",
      explanation:
        "No prior session for this exercise — enter a starting load instead of guessing.",
      inputsSummary: `${exerciseName} — no stored history`,
    };
  }

  const last = recentSessions[0]!;
  const loads = last.map((s) => s.load).filter((v): v is number => v != null);
  const reps = last.map((s) => s.reps).filter((v): v is number => v != null);
  const load = loads[0] ?? null;

  if (load == null || reps.length === 0) {
    return {
      kind: "ask_starting_load",
      loadKg: null,
      targetReps: [repRangeLow, repRangeLow, repRangeLow],
      targetRepsLow: repRangeLow,
      targetRepsHigh: repRangeHigh,
      rule: "double_progression",
      explanation: "Last session has no usable load/reps — enter a starting load.",
      inputsSummary: `${exerciseName} — incomplete last session`,
    };
  }

  const allAtTop = reps.every((r) => r >= repRangeHigh);
  const twoForTwo =
    recentSessions.length >= 2 &&
    recentSessions.slice(0, 2).every((session) => {
      const lastSet = [...session].reverse().find((s) => s.reps != null);
      return (
        lastSet?.reps != null &&
        lastSet.reps >= repRangeHigh + 2 &&
        session.every((s) => (s.load ?? load) === load)
      );
    });

  let nextLoad = load;
  let targetReps: number[];
  let explanation: string;
  let ruleDetail = "double progression";

  if (allAtTop || twoForTwo) {
    nextLoad = load + incrementKg;
    targetReps = [
      repRangeLow,
      repRangeLow,
      Math.min(repRangeHigh, repRangeLow + 2),
    ];
    explanation = allAtTop
      ? `All working sets reached the top of the range (${repRangeHigh}) → increase load by ${incrementKg} kg and reset toward ${repRangeLow}–${repRangeLow + 2}.`
      : `2-for-2: final set ≥ ${repRangeHigh + 2} for two sessions → increase load by ${incrementKg} kg.`;
    ruleDetail = allAtTop ? "double_progression" : "double_progression_2for2";
  } else {
    const sessionTarget = Math.min(
      repRangeHigh,
      Math.max(repRangeLow, Math.max(...reps)),
    );
    targetReps = bumpTargets(reps, sessionTarget, repRangeHigh);
    // Pad/truncate to last session length (min 3 for display)
    while (targetReps.length < Math.max(3, reps.length)) {
      targetReps.push(sessionTarget);
    }
    targetReps = targetReps.slice(0, Math.max(3, reps.length));
    explanation = `All sets within range but the top (${repRangeHigh}) not reached → repeat ${load} kg, target ${targetReps.join("/")}.`;
  }

  if (daysSinceLast != null && daysSinceLast > 7) {
    nextLoad = Math.round(nextLoad * 0.9 * 4) / 4; // nearest 0.25
    explanation += ` More than 7 days since last session (${daysSinceLast}d) → first session back at ~90% (${nextLoad} kg).`;
    ruleDetail = "double_progression_comeback";
  }

  if ((fatigue != null && fatigue >= 4) || (soreness != null && soreness >= 4)) {
    nextLoad = Math.max(0, nextLoad - incrementKg);
    explanation += ` Fatigue/soreness ≥ 4 → reduce by one increment to ${nextLoad} kg.`;
    ruleDetail = "double_progression_fatigue";
  }

  return {
    kind: "suggest",
    loadKg: nextLoad,
    targetReps,
    targetRepsLow: Math.min(...targetReps),
    targetRepsHigh: Math.max(...targetReps),
    rule: ruleDetail,
    explanation,
    inputsSummary: `${exerciseName} — last session ${formatSets(last)}. ${explanation} Rule: ${ruleDetail.replaceAll("_", " ")}.`,
  };
}

export function defaultIncrementKg(primaryPattern: string | null): number {
  if (primaryPattern === "squat" || primaryPattern === "hinge") return 5;
  return 2.5;
}
