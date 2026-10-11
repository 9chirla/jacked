import { describe, expect, it } from "vitest";
import { applyCompletion, markPastPlannedMissed } from "@/lib/plan/completion";
import { planWeek, pickTrainingDays } from "@/lib/plan/plan-week";
import { rescheduleMissed } from "@/lib/plan/reschedule";
import { nextTemplateIndex } from "@/lib/plan/rotation";
import { localDateString, weekStartFor } from "@/lib/plan/week";
import type { TemplateRef } from "@/lib/plan/types";

const A: TemplateRef = { id: "ta", name: "Full Body A", sortOrder: 0, dayLabel: "A" };
const B: TemplateRef = { id: "tb", name: "Full Body B", sortOrder: 1, dayLabel: "B" };
const templates = [A, B];

describe("weekStartFor", () => {
  it("returns Sunday for a mid-week date", () => {
    // 2026-10-14 is Wednesday
    expect(weekStartFor("2026-10-14", "Europe/London")).toBe("2026-10-11");
  });

  it("Saturday night calendar day still belongs to that week's Sunday start", () => {
    expect(weekStartFor("2026-10-17", "Europe/London")).toBe("2026-10-11");
  });

  it("Sunday is its own week start", () => {
    expect(weekStartFor("2026-10-11", "UTC")).toBe("2026-10-11");
  });
});

describe("localDateString / DST", () => {
  it("formats a London instant on the correct local calendar day", () => {
    // 2026-03-29 01:30 UTC is 02:30 BST after spring forward
    const instant = new Date("2026-03-29T01:30:00.000Z");
    expect(localDateString(instant, "Europe/London")).toBe("2026-03-29");
  });
});

describe("rotation", () => {
  it("continues A→B→A from last completed", () => {
    expect(nextTemplateIndex(templates, "ta")).toBe(1);
    expect(nextTemplateIndex(templates, "tb")).toBe(0);
    expect(nextTemplateIndex(templates, null)).toBe(0);
  });
});

describe("planWeek", () => {
  it("plans zero days when none free", () => {
    const plan = planWeek({
      weekStart: "2026-10-11",
      availableDays: [],
      templates,
      lastCompletedTemplateId: null,
      today: "2026-10-11",
    });
    expect(plan).toEqual([]);
  });

  it("plans 1–2 days when fewer than 3 free", () => {
    const plan = planWeek({
      weekStart: "2026-10-11",
      availableDays: [1, 3], // Mon, Wed
      templates,
      lastCompletedTemplateId: null,
      today: "2026-10-11",
    });
    expect(plan).toHaveLength(2);
    expect(plan.map((p) => p.templateId)).toEqual(["ta", "tb"]);
  });

  it("caps at 3 and spreads when 7 free", () => {
    const days = pickTrainingDays(
      "2026-10-11",
      [0, 1, 2, 3, 4, 5, 6],
      "2026-10-11",
      3,
    );
    expect(days).toHaveLength(3);
    expect(days[0]! < days[1]! && days[1]! < days[2]!).toBe(true);
  });

  it("continues rotation from last completed B → next is A", () => {
    const plan = planWeek({
      weekStart: "2026-10-11",
      availableDays: [1, 3, 5],
      templates,
      lastCompletedTemplateId: "tb",
      today: "2026-10-11",
    });
    expect(plan.map((p) => p.templateId)).toEqual(["ta", "tb", "ta"]);
  });

  it("skips days before today when planning mid-week", () => {
    const plan = planWeek({
      weekStart: "2026-10-11",
      availableDays: [0, 1, 2, 3, 4], // Sun–Thu
      templates,
      lastCompletedTemplateId: null,
      today: "2026-10-14", // Wed
    });
    expect(plan.every((p) => p.date >= "2026-10-14")).toBe(true);
    expect(plan.length).toBeLessThanOrEqual(3);
  });
});

describe("applyCompletion", () => {
  const base = planWeek({
    weekStart: "2026-10-11",
    availableDays: [1, 3, 5],
    templates,
    lastCompletedTemplateId: null,
    today: "2026-10-11",
  });

  it("marks matching day done and links session", () => {
    const next = applyCompletion(base, {
      sessionId: "s1",
      templateId: base[0]!.templateId,
      completedDate: base[0]!.date,
      status: "completed",
    });
    expect(next[0]!.status).toBe("done");
    expect(next[0]!.sessionId).toBe("s1");
  });

  it("does not advance on abandoned session", () => {
    const next = applyCompletion(base, {
      sessionId: "s1",
      templateId: base[0]!.templateId,
      completedDate: base[0]!.date,
      status: "abandoned",
    });
    expect(next).toEqual(base);
  });

  it("records off-plan completion as an extra done day", () => {
    const next = applyCompletion(base, {
      sessionId: "s9",
      templateId: "tb",
      completedDate: "2026-10-13",
      status: "completed",
    });
    expect(next.some((d) => d.date === "2026-10-13" && d.status === "done")).toBe(
      true,
    );
  });
});

describe("rescheduleMissed + markPast", () => {
  it("moves missed onto remaining free days", () => {
    let plan = planWeek({
      weekStart: "2026-10-11",
      availableDays: [1, 3, 5],
      templates,
      lastCompletedTemplateId: null,
      today: "2026-10-11",
    });
    plan = markPastPlannedMissed(plan, "2026-10-15");
    const next = rescheduleMissed({
      weekStart: "2026-10-11",
      plannedDays: plan,
      availableDays: [1, 3, 5, 6],
      templates,
      today: "2026-10-15",
      lastCompletedTemplateId: null,
    });
    expect(next.some((d) => d.status === "planned" && d.date >= "2026-10-15")).toBe(
      true,
    );
  });
});
