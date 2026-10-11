import { enqueueOutbox } from "@/lib/offline/outbox";
import { flushOutbox } from "@/lib/offline/flush";
import type { OutboxEntry } from "@/lib/offline/db";
import { isAppOnline } from "@/lib/offline/network";
import type { SyncActionResult } from "@/lib/offline/sync-dispatch";

type MutateArgs = {
  entity: OutboxEntry["entity"];
  op: OutboxEntry["op"];
  payload: unknown;
  clientKey?: string;
  /** Direct online attempt; if omitted, only queues + flush. */
  execute?: () => Promise<SyncActionResult>;
};

/**
 * Write path: enqueue outbox, then try network when online.
 * Offline → `{ ok: true, queued: true }` (local UI must already reflect the write).
 * Online failure → keeps outbox, returns error (never pretend success).
 */
export async function queueAndSync(
  args: MutateArgs,
): Promise<SyncActionResult & { queued?: boolean; outboxId?: string }> {
  const entry = await enqueueOutbox({
    entity: args.entity,
    op: args.op,
    payload: args.payload,
    clientKey: args.clientKey ?? null,
  });

  const offline = !isAppOnline();

  if (offline) {
    return { ok: true, queued: true, outboxId: entry.id };
  }

  if (args.execute) {
    try {
      const result = await args.execute();
      if (result.ok) {
        const { removeOutbox } = await import("@/lib/offline/outbox");
        await removeOutbox(entry.id);
        return { ...result, queued: false, outboxId: entry.id };
      }
      const { markOutboxFailed } = await import("@/lib/offline/outbox");
      await markOutboxFailed(entry.id, result.error);
      return { ...result, queued: true, outboxId: entry.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      const { markOutboxFailed } = await import("@/lib/offline/outbox");
      await markOutboxFailed(entry.id, msg);
      return { ok: false, error: msg, queued: true, outboxId: entry.id };
    }
  }

  await flushOutbox();
  return { ok: true, queued: true, outboxId: entry.id };
}
