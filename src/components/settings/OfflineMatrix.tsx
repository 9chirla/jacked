"use client";

import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { useSyncStatus } from "@/components/pwa/SyncProvider";
import {
  listOpenSyncConflicts,
  resolveSyncConflict,
} from "@/app/actions/sync";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import type { OutboxEntry } from "@/lib/offline/db";
import { listOutbox, removeOutbox } from "@/lib/offline/outbox";
import { useCallback, useEffect, useState, useTransition } from "react";

const MATRIX: { fn: string; online: boolean; offline: string }[] = [
  { fn: "View today's planned workout", online: true, offline: "✅ from cache" },
  { fn: "Week plan view / edit", online: true, offline: "✅ IDB + queued upsert" },
  { fn: "Log sets, complete a workout", online: true, offline: "✅ queued" },
  { fn: "Edit/delete a cached workout", online: true, offline: "✅ queued" },
  { fn: "Body weight entry", online: true, offline: "✅ queued" },
  { fn: "View cached history & charts", online: true, offline: "✅ cached range" },
  {
    fn: "Search full history beyond cache",
    online: true,
    offline: "❌ unavailable offline",
  },
  {
    fn: "Progression suggestions",
    online: true,
    offline: "✅ local from cache",
  },
  { fn: "AI narration", online: true, offline: "❌ rule-based only" },
  { fn: "Create custom exercise", online: true, offline: "✅ queued" },
  { fn: "Export data", online: true, offline: "❌ needs DB" },
  { fn: "Sign in / sign out", online: true, offline: "❌ session persists" },
];

type ConflictRow = {
  id: string;
  entity: string;
  client_payload: unknown;
  server_payload: unknown;
  created_at: string;
};

function describeEntry(entry: OutboxEntry): string {
  return `${entry.entity} · ${entry.op}`;
}

export function OfflineMatrix() {
  const {
    online,
    simulateOffline,
    setSimulateOfflineMode,
    pending,
    flushNow,
    lastFlushAt,
    lastSyncError,
    refreshPending,
  } = useSyncStatus();
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [queue, setQueue] = useState<OutboxEntry[]>([]);
  const [pendingUi, startTransition] = useTransition();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const reloadQueue = useCallback(async () => {
    try {
      setQueue(await listOutbox());
    } catch {
      setQueue([]);
    }
  }, []);

  useEffect(() => {
    startTransition(async () => {
      const result = await listOpenSyncConflicts();
      if (result.ok && Array.isArray(result.data)) {
        setConflicts(result.data as ConflictRow[]);
      }
      await reloadQueue();
    });
  }, [reloadQueue, pending]);

  return (
    <div className="space-y-4">
      <Toggle
        checked={simulateOffline}
        onChange={setSimulateOfflineMode}
        label="Simulate offline"
        description="No DevTools needed. Queues writes to the outbox; turn off to sync."
      />

      <p className="text-[14px] text-muted">
        Status:{" "}
        <span className="text-ink">
          {online
            ? "Online"
            : simulateOffline
              ? "Simulated offline"
              : "Offline"}
        </span>
        {pending > 0 ? (
          <>
            {" "}
            · <span className="tabular text-ink">{pending}</span> queued
          </>
        ) : null}
        {lastFlushAt ? (
          <>
            {" "}
            · last sync{" "}
            <span className="tabular text-ink">
              {lastFlushAt.slice(11, 19)} UTC
            </span>
          </>
        ) : null}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!online || pendingUi}
          onClick={() => {
            setSyncMessage(null);
            startTransition(async () => {
              const result = await flushNow();
              await reloadQueue();
              await refreshPending();
              if (result.remaining === 0) {
                setSyncMessage(
                  result.flushed > 0
                    ? `Synced ${result.flushed} item(s). Queue clear.`
                    : "Queue clear.",
                );
              } else {
                setSyncMessage(
                  `Still ${result.remaining} waiting — see error below.`,
                );
              }
            });
          }}
        >
          Sync now
        </Button>
      </div>

      {lastSyncError || syncMessage ? (
        <p
          className={`text-[14px] ${lastSyncError ? "text-danger" : "text-muted"}`}
          role={lastSyncError ? "alert" : "status"}
        >
          {lastSyncError
            ? `Sync error: ${lastSyncError}`
            : syncMessage}
        </p>
      ) : null}

      {queue.length > 0 ? (
        <div className="space-y-2 rounded-[var(--radius)] border border-line p-3">
          <h3 className="text-[14px] font-medium text-ink">
            Waiting to sync ({queue.length})
          </h3>
          <ul className="space-y-3">
            {queue.map((entry) => (
              <li key={entry.id} className="space-y-1 text-[13px]">
                <p className="text-ink">
                  <span className="tabular">{describeEntry(entry)}</span>
                  {" · "}
                  <span className="text-muted">{entry.status}</span>
                </p>
                {entry.lastError ? (
                  <p className="text-danger">{entry.lastError}</p>
                ) : (
                  <p className="text-muted">
                    No error yet — tap Sync now while Online.
                  </p>
                )}
                <button
                  type="button"
                  className="text-[13px] text-muted underline-offset-4 hover:underline"
                  onClick={() =>
                    startTransition(async () => {
                      await removeOutbox(entry.id);
                      await reloadQueue();
                      await refreshPending();
                    })
                  }
                >
                  Discard this item
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="text-[14px] font-medium text-ink">Install</h3>
        <div className="mt-2">
          <InstallPrompt />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-left text-[13px]">
          <thead>
            <tr className="text-muted">
              <th className="py-1 pr-2 font-medium">Function</th>
              <th className="py-1 pr-2 font-medium">Online</th>
              <th className="py-1 font-medium">Offline</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row) => (
              <tr key={row.fn} className="border-t border-line/70 text-ink">
                <td className="py-2 pr-2 align-top">{row.fn}</td>
                <td className="py-2 pr-2 align-top">✅</td>
                <td className="py-2 align-top">{row.offline}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conflicts.length > 0 ? (
        <div className="space-y-2 border-t border-line pt-3">
          <h3 className="text-[14px] font-medium text-ink">
            Sync conflicts ({conflicts.length})
          </h3>
          <p className="text-[13px] text-muted">
            Completed workouts are never last-write-wins. Choose a side.
          </p>
          {conflicts.map((c) => (
            <div
              key={c.id}
              className="space-y-2 rounded-[var(--radius)] border border-line p-3"
            >
              <p className="text-[14px] text-ink">
                <span className="tabular">{c.entity}</span> ·{" "}
                {c.created_at.slice(0, 16)}
              </p>
              <div className="grid gap-2 text-[12px] text-muted sm:grid-cols-2">
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-surface-2 p-2">
                  local: {JSON.stringify(c.client_payload, null, 0)}
                </pre>
                <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-surface-2 p-2">
                  server: {JSON.stringify(c.server_payload, null, 0)}
                </pre>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10 text-[14px]"
                  onClick={() =>
                    startTransition(async () => {
                      await resolveSyncConflict({
                        id: c.id,
                        resolution: "keep_local",
                      });
                      setConflicts((rows) => rows.filter((r) => r.id !== c.id));
                    })
                  }
                >
                  Keep local
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="min-h-10 text-[14px]"
                  onClick={() =>
                    startTransition(async () => {
                      await resolveSyncConflict({
                        id: c.id,
                        resolution: "keep_server",
                      });
                      setConflicts((rows) => rows.filter((r) => r.id !== c.id));
                    })
                  }
                >
                  Keep server
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-10 text-[14px]"
                  onClick={() =>
                    startTransition(async () => {
                      await resolveSyncConflict({
                        id: c.id,
                        resolution: "dismissed",
                      });
                      setConflicts((rows) => rows.filter((r) => r.id !== c.id));
                    })
                  }
                >
                  Dismiss
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
