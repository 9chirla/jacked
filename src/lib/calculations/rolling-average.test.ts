import { describe, expect, it } from "vitest";
import { centredSevenDayAverage } from "./rolling-average";

describe("centredSevenDayAverage (§10.10)", () => {
  it("averages 7 consecutive days; early days have no full centred value", () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({
      date: `2026-10-0${i + 1}`,
      weightKg: 74 + i,
    }));
    entries[6]!.weightKg = 80;

    const points = centredSevenDayAverage(entries);
    expect(points).toHaveLength(7);

    // Days 1–3 (indices 0–2): incomplete ±3 window → not full
    expect(points[0]!.centredStatus).not.toBe("full");
    expect(points[1]!.centredStatus).not.toBe("full");
    expect(points[2]!.centredStatus).not.toBe("full");

    // Middle day (index 3) sees all 7 → full average of the series
    expect(points[3]!.centredStatus).toBe("full");
    const expected =
      entries.reduce((s, e) => s + e.weightKg, 0) / entries.length;
    expect(points[3]!.centredAvgKg).toBeCloseTo(expected, 5);

    expect(points[6]!.weightKg).toBe(80);
  });

  it("never invents points for missing days", () => {
    const points = centredSevenDayAverage([
      { date: "2026-10-01", weightKg: 80 },
      { date: "2026-10-05", weightKg: 79 },
    ]);
    expect(points).toHaveLength(2);
    expect(points.every((p) => p.centredStatus !== "full")).toBe(true);
  });
});
