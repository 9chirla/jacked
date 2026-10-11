import { describe, expect, it } from "vitest";
import { periodVolumeDelta, weeklyVolumeBars } from "./weekly-volume";

describe("weeklyVolumeBars", () => {
  it("clips leading empty weeks before the first logged session", () => {
    const asOf = new Date("2026-10-11T12:00:00.000Z");
    const bars = weeklyVolumeBars(
      [
        {
          completedAt: "2026-10-10T10:00:00.000Z",
          startedAt: null,
          totalVolume: 1840,
        },
        {
          completedAt: "2026-10-08T10:00:00.000Z",
          startedAt: null,
          totalVolume: 160,
        },
        {
          completedAt: "2026-09-26T10:00:00.000Z",
          startedAt: null,
          totalVolume: 500,
        },
      ],
      4,
      asOf,
    );
    // First session is W39 — W38 (empty lead-in) is omitted; W40 gap stays 0
    expect(bars.map((b) => b.weekKey)).toEqual([
      "2026-W39",
      "2026-W40",
      "2026-W41",
    ]);
    expect(bars[0]!.volume).toBe(500);
    expect(bars[1]!.volume).toBe(0);
    expect(bars[2]!.volume).toBe(2000);
  });

  it("returns empty when there are no sessions", () => {
    expect(
      weeklyVolumeBars([], 12, new Date("2026-10-11T12:00:00.000Z")),
    ).toEqual([]);
  });

  it("can keep a fixed trailing window when clipBeforeFirst is false", () => {
    const asOf = new Date("2026-10-11T12:00:00.000Z");
    const bars = weeklyVolumeBars(
      [
        {
          completedAt: "2026-10-10T10:00:00.000Z",
          startedAt: null,
          totalVolume: 100,
        },
      ],
      4,
      asOf,
      { clipBeforeFirst: false },
    );
    expect(bars).toHaveLength(4);
    expect(bars[3]!.volume).toBe(100);
    expect(bars[0]!.volume).toBe(0);
  });
});

describe("periodVolumeDelta", () => {
  it("compares equal trailing windows", () => {
    const asOf = new Date("2026-10-11T12:00:00.000Z");
    const delta = periodVolumeDelta(
      [
        {
          completedAt: "2026-10-10T10:00:00.000Z",
          startedAt: null,
          totalVolume: 2000,
        },
        {
          completedAt: "2026-09-12T10:00:00.000Z",
          startedAt: null,
          totalVolume: 1000,
        },
      ],
      4,
      asOf,
    );
    expect(delta.current).toBe(2000);
    expect(delta.previous).toBe(1000);
    expect(delta.delta).toBe(1000);
  });
});
