import { describe, expect, it } from "vitest";
import { evaluateMeasuredPr, nextMeasuredPrHolder } from "./prs";

describe("evaluateMeasuredPr (§10.4 / §10.10)", () => {
  it("marks new set as PR when no previous best", () => {
    expect(
      evaluateMeasuredPr(
        {
          id: "new",
          kind: "working",
          completed: true,
          load: 100,
          reps: 5,
        },
        null,
      ),
    ).toEqual({ isPr: true, demoteId: null });
  });

  it("promotes new PR and demotes previous holder (100×5 → 102.5×5)", () => {
    expect(
      evaluateMeasuredPr(
        {
          id: "new",
          kind: "working",
          completed: true,
          load: 102.5,
          reps: 5,
        },
        { id: "old", load: 100 },
      ),
    ).toEqual({ isPr: true, demoteId: "old" });
  });

  it("does not mark warm-ups as PRs", () => {
    expect(
      evaluateMeasuredPr(
        {
          id: "wu",
          kind: "warmup",
          completed: true,
          load: 120,
          reps: 5,
        },
        { id: "old", load: 100 },
      ),
    ).toEqual({ isPr: false, demoteId: null });
  });

  it("ignores incomplete sets", () => {
    expect(
      evaluateMeasuredPr(
        {
          id: "open",
          kind: "working",
          completed: false,
          load: 200,
          reps: 5,
        },
        null,
      ),
    ).toEqual({ isPr: false, demoteId: null });
  });

  it("does not promote on equal load", () => {
    expect(
      evaluateMeasuredPr(
        {
          id: "tie",
          kind: "working",
          completed: true,
          load: 100,
          reps: 5,
        },
        { id: "old", load: 100 },
      ),
    ).toEqual({ isPr: false, demoteId: null });
  });
});

describe("nextMeasuredPrHolder", () => {
  it("promotes the next-best working set after deletion", () => {
    expect(
      nextMeasuredPrHolder([
        { id: "a", load: 90, kind: "working", completed: true },
        { id: "b", load: 95, kind: "working", completed: true },
        { id: "wu", load: 120, kind: "warmup", completed: true },
      ]),
    ).toBe("b");
  });
});
