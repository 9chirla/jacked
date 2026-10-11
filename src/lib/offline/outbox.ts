import { nextBackoffMs } from "@/lib/offline/backoff";
import { getJackedDb, type OutboxEntry } from "@/lib/offline/db";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ob-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueOutbox(
  partial: Omit<
    OutboxEntry,
    "id" | "clientCreatedAt" | "attempts" | "nextAttemptAt" | "lastError" | "status"
  > & { id?: string },
): Promise<OutboxEntry> {
  const db = await getJackedDb();

  if (partial.clientKey) {
    const all = await db.getAll("outbox");
    const existing = all.find(
      (e) =>
        e.clientKey === partial.clientKey &&
        e.status !== "syncing" &&
        e.entity === partial.entity &&
        e.op === partial.op,
    );
    if (existing) {
      const updated: OutboxEntry = {
        ...existing,
        payload: partial.payload,
        status: "pending",
        lastError: null,
        nextAttemptAt: null,
      };
      await db.put("outbox", updated);
      return updated;
    }
  }

  const entry: OutboxEntry = {
    id: partial.id ?? uuid(),
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
  await db.put("outbox", entry);
  return entry;
}

export async function listOutbox(): Promise<OutboxEntry[]> {
  const db = await getJackedDb();
  const rows = await db.getAll("outbox");
  return rows.sort((a, b) =>
    a.clientCreatedAt.localeCompare(b.clientCreatedAt),
  );
}

export async function countPendingOutbox(): Promise<number> {
  const rows = await listOutbox();
  return rows.filter(
    (r) =>
      r.status === "pending" ||
      r.status === "failed" ||
      r.status === "syncing",
  ).length;
}

/** Reset interrupted syncs so they can be retried. */
export async function resetStuckSyncing(): Promise<void> {
  const db = await getJackedDb();
  const rows = await db.getAll("outbox");
  for (const row of rows) {
    if (row.status === "syncing") {
      await db.put("outbox", {
        ...row,
        status: "pending",
        nextAttemptAt: null,
      });
    }
  }
}

/** Clear backoff so Sync now retries immediately. */
export async function markOutboxReady(id: string): Promise<void> {
  const db = await getJackedDb();
  const row = await db.get("outbox", id);
  if (!row) return;
  await db.put("outbox", {
    ...row,
    status: "pending",
    nextAttemptAt: null,
  });
}

export async function removeOutbox(id: string): Promise<void> {
  const db = await getJackedDb();
  await db.delete("outbox", id);
}

export async function markOutboxSyncing(id: string): Promise<void> {
  const db = await getJackedDb();
  const row = await db.get("outbox", id);
  if (!row) return;
  await db.put("outbox", { ...row, status: "syncing" });
}

export async function markOutboxFailed(
  id: string,
  error: string,
): Promise<void> {
  const db = await getJackedDb();
  const row = await db.get("outbox", id);
  if (!row) return;
  const attempts = row.attempts + 1;
  await db.put("outbox", {
    ...row,
    attempts,
    status: "failed",
    lastError: error,
    nextAttemptAt: new Date(nextBackoffMs(attempts)).toISOString(),
  });
}

export async function clearOutbox(): Promise<void> {
  const db = await getJackedDb();
  await db.clear("outbox");
}
