import { describe, expect, it } from "vitest";
import { buildCoachReport } from "./build-coach";
import { mentionsPainOrInjury } from "./pain-keywords";

const emptyBase = {
  tone: "analytical" as const,
  sessionsTarget: 3,
  sessions7d: 0,
  sessions28d: 0,
  volume7d: 0,
  volume28d: 0,
  volumePrior28d: 0,
  prs7d: 0,
  hardSetsByPattern14d: {},
  trackedPatterns: ["push", "pull", "squat", "hinge"],
  streakWeeks: 0,
  checkInToday: null,
  checkInEnabled: true,
  limitations: null,
  nextSession: null,
};

describe("buildCoachReport — empty account gate", () => {
  it("never invents sessions, volume, or PRs", () => {
    const report = buildCoachReport(emptyBase);
    const all = [
      ...report.recentTraining,
      ...report.highlights,
      ...report.consistency,
      ...report.gaps,
      ...report.nextSessionClaims,
    ]
      .map((c) => c.text)
      .join(" ");

    expect(all).toMatch(/0 sessions/);
    expect(all).not.toMatch(/\b[1-9]\d* sessions in the last 7 days\b/);
    expect(report.highlights.some((h) => h.source === "highlights=none")).toBe(
      true,
    );
    expect(report.nextSession).toBeNull();
    // Every claim has a source
    for (const c of [
      ...report.recentTraining,
      ...report.highlights,
      ...report.safety,
    ]) {
      expect(c.source.length).toBeGreaterThan(0);
    }
  });
});

describe("buildCoachReport — data-bound claims", () => {
  it("reports PRs and volume only when aggregates support them", () => {
    const report = buildCoachReport({
      ...emptyBase,
      sessions7d: 2,
      sessions28d: 6,
      volume7d: 4000,
      volume28d: 12000,
      volumePrior28d: 9000,
      prs7d: 1,
      hardSetsByPattern14d: { push: 8, pull: 6, squat: 9, hinge: 0 },
      streakWeeks: 3,
      nextSession: {
        templateId: "t1",
        templateName: "Full Body A",
        reason: "Last completed session used Full Body B",
        exercises: [
          {
            exerciseId: "e1",
            exerciseName: "Bench Press",
            lastSummary: "80 kg × 8/8/7",
            suggestionText: "Keep 80 kg, target 8/8/8",
            rule: "double_progression",
          },
        ],
      },
    });

    expect(report.recentTraining[0]!.text).toContain("2 sessions");
    expect(report.recentTraining[0]!.source).toContain("prs_7d=1");
    expect(report.highlights.some((h) => h.source.includes("prs_7d=1"))).toBe(
      true,
    );
    expect(
      report.highlights.some((h) => h.source.includes("volume_28d=12000")),
    ).toBe(true);
    expect(report.gaps.some((g) => g.source.includes("pattern_14d=hinge"))).toBe(
      true,
    );
    expect(report.gaps.some((g) => g.source.includes("pattern_14d=push"))).toBe(
      false,
    );
    expect(report.nextSessionClaims[0]!.text).toContain("Full Body A");
  });
});

describe("pain keywords", () => {
  it("flags injury language without classifying", () => {
    expect(mentionsPainOrInjury("sharp pain in knee")).toBe(true);
    expect(mentionsPainOrInjury("felt strong today")).toBe(false);
  });
});
