import { describe, expect, it } from "vitest";
import { isDue, nextBackoffMs } from "@/lib/offline/backoff";

describe("nextBackoffMs", () => {
  it("grows with attempts and stays capped", () => {
    const t0 = 1_000_000;
    const a0 = nextBackoffMs(0, t0) - t0;
    const a5 = nextBackoffMs(5, t0) - t0;
    const a20 = nextBackoffMs(20, t0) - t0;
    expect(a0).toBeGreaterThanOrEqual(1000);
    expect(a5).toBeGreaterThan(a0);
    expect(a20).toBeLessThanOrEqual(15 * 60_000 + 1000);
  });
});

describe("isDue", () => {
  it("treats null as due", () => {
    expect(isDue(null, 100)).toBe(true);
  });

  it("compares timestamps", () => {
    expect(isDue(new Date(50).toISOString(), 100)).toBe(true);
    expect(isDue(new Date(200).toISOString(), 100)).toBe(false);
  });
});
