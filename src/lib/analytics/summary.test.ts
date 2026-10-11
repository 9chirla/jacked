import { describe, expect, it } from "vitest";
import { buildAnalyticsSummary } from "./summary";

describe("buildAnalyticsSummary", () => {
  it("omits unsupported claims rather than inventing them", () => {
    expect(
      buildAnalyticsSummary({
        sessionsThisWeek: 0,
        sessionsTarget: 3,
        streakWeeks: 0,
        volumeDelta: null,
        measuredPrCount: 0,
        weightTrend: null,
      }),
    ).toBe("0 of 3 planned sessions this week.");
  });

  it("includes only evidence-backed aggregates", () => {
    const text = buildAnalyticsSummary({
      sessionsThisWeek: 2,
      sessionsTarget: 3,
      streakWeeks: 4,
      volumeDelta: 500,
      measuredPrCount: 1,
      weightTrend: "down",
    });
    expect(text).toContain("2 of 3 planned sessions");
    expect(text).toContain("current streak 4 weeks");
    expect(text).toContain("volume +500");
    expect(text).toContain("1 measured PR");
    expect(text).toContain("trending down");
  });
});
