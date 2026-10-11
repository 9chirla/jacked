import { describe, expect, it } from "vitest";
import { suggestProgression } from "./progression";

describe("suggestProgression (§10.6 / §10.10)", () => {
  it("no history asks for a starting load (never invents)", () => {
    const result = suggestProgression({
      exerciseName: "Bench Press",
      recentSessions: [],
      repRangeLow: 6,
      repRangeHigh: 12,
      incrementKg: 2.5,
      daysSinceLast: null,
    });
    expect(result.kind).toBe("ask_starting_load");
    expect(result.loadKg).toBeNull();
  });

  it("double progression: all sets at range top → +increment, reset reps", () => {
    const result = suggestProgression({
      exerciseName: "Bench Press",
      recentSessions: [
        [
          { load: 60, reps: 12 },
          { load: 60, reps: 12 },
          { load: 60, reps: 12 },
        ],
      ],
      repRangeLow: 6,
      repRangeHigh: 12,
      incrementKg: 2.5,
      daysSinceLast: 2,
    });
    expect(result.kind).toBe("suggest");
    expect(result.loadKg).toBe(62.5);
    expect(result.targetReps[0]).toBe(6);
    expect(result.inputsSummary).toContain("60 kg");
  });

  it("progression miss: 8/7/6 with target climb → same load, 8/8/7", () => {
    const result = suggestProgression({
      exerciseName: "Bench Press",
      recentSessions: [
        [
          { load: 80, reps: 8 },
          { load: 80, reps: 7 },
          { load: 80, reps: 6 },
        ],
      ],
      repRangeLow: 6,
      repRangeHigh: 12,
      incrementKg: 2.5,
      daysSinceLast: 3,
    });
    expect(result.loadKg).toBe(80);
    expect(result.targetReps.slice(0, 3)).toEqual([8, 8, 7]);
  });

  it("respects stored override", () => {
    const result = suggestProgression({
      exerciseName: "Squat",
      recentSessions: [[{ load: 100, reps: 5 }]],
      repRangeLow: 6,
      repRangeHigh: 12,
      incrementKg: 5,
      daysSinceLast: 1,
      override: { load: 95, targetRepsLow: 6, targetRepsHigh: 8 },
    });
    expect(result.kind).toBe("override");
    expect(result.loadKg).toBe(95);
  });

  it("reduces ~10% after >7 day gap", () => {
    const result = suggestProgression({
      exerciseName: "Row",
      recentSessions: [
        [
          { load: 100, reps: 8 },
          { load: 100, reps: 8 },
          { load: 100, reps: 8 },
        ],
      ],
      repRangeLow: 6,
      repRangeHigh: 12,
      incrementKg: 2.5,
      daysSinceLast: 10,
    });
    expect(result.loadKg).toBe(90);
    expect(result.explanation).toContain("7 days");
  });
});
