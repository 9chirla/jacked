import type { TemplateRef } from "@/lib/plan/types";

/** Active templates sorted by sortOrder (Full Body A then B). */
export function sortTemplates(templates: TemplateRef[]): TemplateRef[] {
  return [...templates].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Index of the template that should come AFTER `lastCompletedTemplateId`.
 * If unknown / null, start at 0 (A).
 */
export function nextTemplateIndex(
  templates: TemplateRef[],
  lastCompletedTemplateId: string | null,
): number {
  const sorted = sortTemplates(templates);
  if (sorted.length === 0) return 0;
  if (!lastCompletedTemplateId) return 0;
  const idx = sorted.findIndex((t) => t.id === lastCompletedTemplateId);
  if (idx < 0) return 0;
  return (idx + 1) % sorted.length;
}

export function templateAt(
  templates: TemplateRef[],
  index: number,
): TemplateRef | null {
  const sorted = sortTemplates(templates);
  if (sorted.length === 0) return null;
  return sorted[((index % sorted.length) + sorted.length) % sorted.length]!;
}
