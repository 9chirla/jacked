import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OutboxEntry } from "@/lib/offline/db";

const outboxStore = new Map<string, OutboxEntry>();
let online = true;

vi.mock("@/lib/offline/network", () => ({
  isAppOnline: () => online,
}));

vi.mock("@/lib/offline/outbox", () => ({
  enqueueOutbox: async (partial: {
    entity: OutboxEntry["entity"];
    op: OutboxEntry["op"];
    payload: unknown;
    clientKey?: string | null;
  }) => {
    const existing = [...outboxStore.values()].find(
      (e) =>
        e.clientKey &&
        e.clientKey === partial.clientKey &&
        e.entity === partial.entity &&
        e.op === partial.op,
    );
    if (existing) {
      const updated = {
        ...existing,
        payload: partial.payload,
        status: "pending" as const,
        lastError: null,
        nextAttemptAt: null,
      };
      outboxStore.set(updated.id, updated);
      return updated;
    }
    const entry: OutboxEntry = {
      id: `ob-${outboxStore.size + 1}`,
      entity: partial.entity,
      op: partial.op,
      payload: partial.payload,
      clientKey: partial.clientKey ?? null,
      clientCreatedAt: new Date().toISOString(),
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      status: "pending",
    };
    outboxStore.set(entry.id, entry);
    return entry;
  },
  listOutbox: async () => [...outboxStore.values()],
  removeOutbox: async (id: string) => {
    outboxStore.delete(id);
  },
  markOutboxSyncing: async (id: string) => {
    const e = outboxStore.get(id);
    if (e) outboxStore.set(id, { ...e, status: "syncing" });
  },
  markOutboxFailed: async (id: string, error: string) => {
    const e = outboxStore.get(id);
    if (e) {
      outboxStore.set(id, {
        ...e,
        status: "failed",
        lastError: error,
        attempts: e.attempts + 1,
      });
    }
  },
  markOutboxReady: async (id: string) => {
    const e = outboxStore.get(id);
    if (e) outboxStore.set(id, { ...e, status: "pending", nextAttemptAt: null });
  },
  resetStuckSyncing: async () => {
    for (const [id, e] of outboxStore) {
      if (e.status === "syncing") {
        outboxStore.set(id, { ...e, status: "pending" });
      }
    }
  },
}));

vi.mock("@/app/actions/sync", () => ({
  logSyncConflict: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/app/actions/library", () => ({
  createCustomExercise: vi.fn(),
}));
vi.mock("@/app/actions/progress", () => ({
  upsertWeighIn: vi.fn(),
  deleteWeighIn: vi.fn(),
}));
vi.mock("@/app/actions/workout", () => ({
  upsertSet: vi.fn(),
  deleteSet: vi.fn(),
  finishSession: vi.fn(),
  deleteSession: vi.fn(),
}));

const upsertWeekPlan = vi.fn(async () => ({ ok: true as const, id: "wp1" }));
vi.mock("@/app/actions/plan", () => ({
  upsertWeekPlan: (...args: unknown[]) => upsertWeekPlan(...args),
}));

describe("week_plan offline outbox", () => {
  beforeEach(() => {
    outboxStore.clear();
    online = true;
    upsertWeekPlan.mockClear();
    upsertWeekPlan.mockResolvedValue({ ok: true, id: "wp1" });
  });

  it("queues offline upsert and flushes once on reconnect", async () => {
    const { queueAndSync } = await import("@/lib/offline/mutate");
    const { flushOutbox } = await import("@/lib/offline/flush");

    online = false;
    const payload = {
      week_start: "2026-10-11",
      timezone: "Europe/London",
      available_days: [1, 3, 5],
      planned_days: [],
      status: "active",
      client_updated_at: "2026-10-11T10:00:00.000Z",
    };

    const queued = await queueAndSync({
      entity: "week_plan",
      op: "upsert",
      payload,
      clientKey: "week-plan:2026-10-11",
      execute: () => upsertWeekPlan(payload),
    });
    expect(queued.ok).toBe(true);
    expect(queued.queued).toBe(true);
    expect(upsertWeekPlan).not.toHaveBeenCalled();
    expect(outboxStore.size).toBe(1);

    online = true;
    const first = await flushOutbox({ force: true });
    expect(first.flushed).toBe(1);
    expect(upsertWeekPlan).toHaveBeenCalledTimes(1);
    expect(outboxStore.size).toBe(0);

    const second = await flushOutbox({ force: true });
    expect(second.flushed).toBe(0);
    expect(upsertWeekPlan).toHaveBeenCalledTimes(1);
  });

  it("idempotent clientKey replaces pending payload", async () => {
    const { enqueueOutbox, listOutbox } = await import("@/lib/offline/outbox");
    online = false;
    await enqueueOutbox({
      entity: "week_plan",
      op: "upsert",
      payload: { week_start: "2026-10-11", v: 1 },
      clientKey: "week-plan:2026-10-11",
    });
    await enqueueOutbox({
      entity: "week_plan",
      op: "upsert",
      payload: { week_start: "2026-10-11", v: 2 },
      clientKey: "week-plan:2026-10-11",
    });
    const rows = await listOutbox();
    expect(rows).toHaveLength(1);
    expect((rows[0].payload as { v: number }).v).toBe(2);
  });
});
