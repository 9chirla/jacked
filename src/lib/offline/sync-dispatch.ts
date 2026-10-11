import type { OutboxEntry } from "@/lib/offline/db";

export type SyncActionResult =
  | { ok: true; id?: string; data?: unknown; conflict?: never }
  | {
      ok: false;
      error: string;
      conflict?: {
        entity: string;
        server: unknown;
        local: unknown;
      };
    };

type Dispatcher = {
  upsertSet: (input: unknown) => Promise<SyncActionResult>;
  deleteSet: (setId: string) => Promise<SyncActionResult>;
  finishSession: (input: unknown) => Promise<SyncActionResult>;
  upsertWeighIn: (input: unknown) => Promise<SyncActionResult>;
  deleteWeighIn: (id: string) => Promise<SyncActionResult>;
  createCustomExercise: (input: unknown) => Promise<SyncActionResult>;
};

/** Execute one outbox entry against live server actions. */
export async function dispatchOutboxEntry(
  entry: OutboxEntry,
  actions: Dispatcher,
): Promise<SyncActionResult> {
  const payload = entry.payload as Record<string, unknown>;

  switch (entry.entity) {
    case "exercise_set":
      if (entry.op === "delete") {
        return actions.deleteSet(String(payload.id));
      }
      // Drop non-uuid ids (tmp-* local drafts) so upsert uses natural key.
      {
        const id =
          typeof payload.id === "string" &&
          /^[0-9a-f-]{36}$/i.test(payload.id)
            ? payload.id
            : undefined;
        return actions.upsertSet({
          ...payload,
          id,
          completed: Boolean(payload.completed),
          source:
            payload.source === "prefill" ||
            payload.source === "import" ||
            payload.source === "demo"
              ? payload.source
              : "manual",
        });
      }
    case "workout_session":
      if (entry.op === "finish") {
        return actions.finishSession(payload);
      }
      return { ok: false, error: `Unsupported session op ${entry.op}` };
    case "body_weight_entry":
      if (entry.op === "delete") {
        return actions.deleteWeighIn(String(payload.id));
      }
      return actions.upsertWeighIn(payload);
    case "exercise":
      if (entry.op === "create") {
        return actions.createCustomExercise(payload);
      }
      return { ok: false, error: `Unsupported exercise op ${entry.op}` };
    default:
      return { ok: false, error: "Unknown outbox entity" };
  }
}
