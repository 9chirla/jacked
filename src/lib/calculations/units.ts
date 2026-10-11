/** Canonical conversion factors (§10.9). Store kg/cm; convert only at boundaries. */
export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN;
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN;
}

/** Display rounding only — never use before storage. */
export function roundMassDisplay(value: number): number {
  return Math.round(value * 10) / 10;
}

export function roundLengthDisplay(value: number): number {
  return Math.round(value * 10) / 10;
}

export function formatMass(kg: number, unit: "kg" | "lb"): string {
  if (unit === "lb") return `${roundMassDisplay(kgToLb(kg))} lb`;
  return `${roundMassDisplay(kg)} kg`;
}
