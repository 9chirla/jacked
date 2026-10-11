import { describe, expect, it } from "vitest";
import {
  cmToIn,
  inToCm,
  kgToLb,
  lbToKg,
  roundMassDisplay,
} from "./units";

describe("unit conversion (§10.9 / §10.10)", () => {
  it("converts 80 kg → 176.4 lb", () => {
    expect(roundMassDisplay(kgToLb(80))).toBe(176.4);
  });

  it("round-trips 176.4 lb → kg → lb", () => {
    const kg = lbToKg(176.4);
    expect(roundMassDisplay(kgToLb(kg))).toBe(176.4);
  });

  it("converts cm ↔ in stably", () => {
    const cm = 180;
    expect(roundMassDisplay(inToCm(cmToIn(cm)))).toBe(180);
  });
});
