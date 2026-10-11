import { describe, expect, it, vi } from "vitest";
import { dispatchOutboxEntry } from "@/lib/offline/sync-dispatch";
import type { OutboxEntry } from "@/lib/offline/db";

function entry(partial: Partial<OutboxEntry> & Pick<OutboxEntry, "entity" | "op" | "payload">): OutboxEntry {
  return {
    id: "1",
    clientCreatedAt: new Date().toISOString(),
    attempts: 0,
    nextAttemptAt: null,
    lastError: null,
    status: "pending",
    clientKey: null,
    ...partial,
  };
}

describe("dispatchOutboxEntry", () => {
  it("routes set upsert", async () => {
    const upsertSet = vi.fn(async () => ({ ok: true as const, id: "s1" }));
    const result = await dispatchOutboxEntry(
      entry({
        entity: "exercise_set",
        op: "upsert",
        payload: { set_number: 1 },
      }),
      {
        upsertSet,
        deleteSet: vi.fn(),
        finishSession: vi.fn(),
        deleteSession: vi.fn(),
        upsertWeighIn: vi.fn(),
        deleteWeighIn: vi.fn(),
        createCustomExercise: vi.fn(),
        upsertWeekPlan: vi.fn(),
      },
    );
    expect(result.ok).toBe(true);
    expect(upsertSet).toHaveBeenCalledOnce();
  });

  it("routes weigh-in delete", async () => {
    const deleteWeighIn = vi.fn(async () => ({ ok: true as const }));
    await dispatchOutboxEntry(
      entry({
        entity: "body_weight_entry",
        op: "delete",
        payload: { id: "w1" },
      }),
      {
        upsertSet: vi.fn(),
        deleteSet: vi.fn(),
        finishSession: vi.fn(),
        deleteSession: vi.fn(),
        upsertWeighIn: vi.fn(),
        deleteWeighIn,
        createCustomExercise: vi.fn(),
        upsertWeekPlan: vi.fn(),
      },
    );
    expect(deleteWeighIn).toHaveBeenCalledWith("w1");
  });

  it("routes session delete", async () => {
    const deleteSession = vi.fn(async () => ({ ok: true as const }));
    await dispatchOutboxEntry(
      entry({
        entity: "workout_session",
        op: "delete",
        payload: { id: "sess1" },
      }),
      {
        upsertSet: vi.fn(),
        deleteSet: vi.fn(),
        finishSession: vi.fn(),
        deleteSession,
        upsertWeighIn: vi.fn(),
        deleteWeighIn: vi.fn(),
        createCustomExercise: vi.fn(),
        upsertWeekPlan: vi.fn(),
      },
    );
    expect(deleteSession).toHaveBeenCalledWith("sess1");
  });

  it("routes week_plan upsert", async () => {
    const upsertWeekPlan = vi.fn(async () => ({ ok: true as const }));
    await dispatchOutboxEntry(
      entry({
        entity: "week_plan",
        op: "upsert",
        payload: { week_start: "2026-10-11" },
      }),
      {
        upsertSet: vi.fn(),
        deleteSet: vi.fn(),
        finishSession: vi.fn(),
        deleteSession: vi.fn(),
        upsertWeighIn: vi.fn(),
        deleteWeighIn: vi.fn(),
        createCustomExercise: vi.fn(),
        upsertWeekPlan,
      },
    );
    expect(upsertWeekPlan).toHaveBeenCalledWith({ week_start: "2026-10-11" });
  });
});
