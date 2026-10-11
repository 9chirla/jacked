import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type DraftSet = {
  id: string;
  session_exercise_id: string;
  set_number: number;
  kind: string;
  load: number | null;
  reps: number | null;
  completed_at: string | null;
  note: string | null;
  dirty?: boolean;
  pendingSync?: boolean;
};

export type SessionDraft = {
  sessionId: string;
  updatedAt: string;
  restEndsAt: number | null;
  activeExerciseId: string | null;
  sets: DraftSet[];
};

export type OutboxStatus = "pending" | "syncing" | "failed";

export type OutboxEntry = {
  id: string;
  entity:
    | "exercise_set"
    | "workout_session"
    | "body_weight_entry"
    | "exercise";
  op: "upsert" | "delete" | "finish" | "create";
  payload: unknown;
  clientCreatedAt: string;
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  status: OutboxStatus;
  /** Optional idempotency / dedupe key */
  clientKey: string | null;
};

export type CacheEntry = {
  key: string;
  updatedAt: string;
  value: unknown;
};

interface JackedDB extends DBSchema {
  sessionDrafts: {
    key: string;
    value: SessionDraft;
  };
  outbox: {
    key: string;
    value: OutboxEntry;
    indexes: { "by-status": string; "by-next": string };
  };
  cache: {
    key: string;
    value: CacheEntry;
  };
}

const DB_NAME = "jacked";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<JackedDB>> | null = null;

export function getJackedDb() {
  if (!dbPromise) {
    dbPromise = openDB<JackedDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore("sessionDrafts", { keyPath: "sessionId" });
        }
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("outbox")) {
            const outbox = db.createObjectStore("outbox", { keyPath: "id" });
            outbox.createIndex("by-status", "status");
            outbox.createIndex("by-next", "nextAttemptAt");
          }
          if (!db.objectStoreNames.contains("cache")) {
            db.createObjectStore("cache", { keyPath: "key" });
          }
        }
      },
    });
  }
  return dbPromise;
}
