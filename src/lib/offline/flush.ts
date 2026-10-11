import { isDue } from "@/lib/offline/backoff";
import {
  listOutbox,
  markOutboxFailed,
  markOutboxReady,
  markOutboxSyncing,
  removeOutbox,
  resetStuckSyncing,
} from "@/lib/offline/outbox";
import { isAppOnline } from "@/lib/offline/network";
import {
  dispatchOutboxEntry,
  type SyncActionResult,
} from "@/lib/offline/sync-dispatch";
import { createCustomExercise } from "@/app/actions/library";
import {
  deleteWeighIn,
  upsertWeighIn,
} from "@/app/actions/progress";
import {
  deleteSet,
  finishSession,
  upsertSet,
} from "@/app/actions/workout";
import { logSyncConflict } from "@/app/actions/sync";

export type FlushSummary = {
  flushed: number;
  failed: number;
  conflicts: number;
  remaining: number;
  lastError: string | null;
};

const defaultActions = {
  upsertSet,
  deleteSet,
  finishSession,
  upsertWeighIn,
  deleteWeighIn,
  createCustomExercise,
};

type FlushOptions = {
  now?: number;
  /** Ignore backoff and retry everything (Sync now / leave simulate). */
  force?: boolean;
};

/** Replay due outbox entries. Safe to call often; skips when offline. */
export async function flushOutbox(
  options: FlushOptions = {},
): Promise<FlushSummary> {
  const now = options.now ?? Date.now();
  const force = options.force ?? false;

  if (!isAppOnline()) {
    const remaining = (await listOutbox()).length;
    return {
      flushed: 0,
      failed: 0,
      conflicts: 0,
      remaining,
      lastError: null,
    };
  }

  await resetStuckSyncing();
  const entries = await listOutbox();
  let flushed = 0;
  let failed = 0;
  let conflicts = 0;
  let lastError: string | null = null;

  for (const entry of entries) {
    if (!force && !isDue(entry.nextAttemptAt, now)) continue;

    if (force) {
      await markOutboxReady(entry.id);
    }

    await markOutboxSyncing(entry.id);
    let result: SyncActionResult;
    try {
      result = await dispatchOutboxEntry(entry, defaultActions);
    } catch (e) {
      result = {
        ok: false,
        error: e instanceof Error ? e.message : "Sync failed",
      };
    }

    if (result.ok) {
      await removeOutbox(entry.id);
      flushed += 1;
      continue;
    }

    lastError = result.error;

    if (result.conflict) {
      conflicts += 1;
      await logSyncConflict({
        entity: result.conflict.entity,
        clientPayload: result.conflict.local,
        serverPayload: result.conflict.server,
        outboxId: entry.id,
      });
      await markOutboxFailed(entry.id, result.error);
      failed += 1;
      continue;
    }

    await markOutboxFailed(entry.id, result.error);
    failed += 1;
  }

  const remaining = (await listOutbox()).length;
  return { flushed, failed, conflicts, remaining, lastError };
}
