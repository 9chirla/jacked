import { describe, expect, it } from "vitest";
import {
  bodyweightSetVolume,
  epleyE1rm,
  renumberSets,
  workingReps,
  workingSetCount,
  workingVolume,
} from "./volume";

describe("workingVolume", () => {
  it("sums working sets and excludes warm-ups (§10.10)", () => {
    const sets = [
      { kind: "warmup", load: 40, reps: 10 },
      { kind: "working", load: 80, reps: 8 },
      { kind: "working", load: 80, reps: 8 },
      { kind: "working", load: 80, reps: 7 },
    ];
    expect(workingVolume(sets)).toBe(1840);
  });

  it("excludes null load from volume", () => {
    expect(
      workingVolume([{ kind: "working", load: null, reps: 8 }]),
    ).toBe(0);
  });
});

describe("workingReps / workingSetCount", () => {
  it("counts working reps only", () => {
    const sets = [
      { kind: "warmup", load: 40, reps: 10, completed: true },
      { kind: "working", load: 80, reps: 8, completed: true },
      { kind: "working", load: 80, reps: 7, completed: true },
    ];
    expect(workingReps(sets)).toBe(15);
    expect(workingSetCount(sets)).toBe(2);
  });
});

describe("epleyE1rm", () => {
  it("computes Epley for 100×5", () => {
    expect(epleyE1rm(100, 5)?.toFixed(2)).toBe("116.67");
  });

  it("returns null above rep ceiling", () => {
    expect(epleyE1rm(100, 12, 10)).toBeNull();
  });
});

describe("renumberSets", () => {
  it("renumbers after deleting set 2 of 4", () => {
    const remaining = [
      { id: "a", set_number: 1 },
      { id: "c", set_number: 3 },
      { id: "d", set_number: 4 },
    ];
    expect(renumberSets(remaining).map((s) => s.set_number)).toEqual([
      1, 2, 3,
    ]);
    expect(renumberSets(remaining).map((s) => s.id)).toEqual(["a", "c", "d"]);
  });
});

describe("bodyweightSetVolume (§10.10)", () => {
  it("pull-up +20 kg × 8 at 84 kg body weight → 832 estimate", () => {
    const result = bodyweightSetVolume({
      bodyWeightKg: 84,
      addedLoadKg: 20,
      reps: 8,
    });
    expect(result.volume).toBe(832);
    expect(result.estimate).toBe(true);
    expect(result.incomplete).toBe(false);
  });
});
