"use client";

import { useSyncStatus } from "@/components/pwa/SyncProvider";

export function SyncBadge() {
  const { online, pending, flushNow } = useSyncStatus();

  if (online && pending === 0) return null;

  return (
    <button
      type="button"
      onClick={() => void flushNow()}
      className="inline-flex min-h-10 items-center rounded-[var(--radius)] px-2 text-[12px] text-muted hover:bg-surface hover:text-ink"
      title={online ? "Retry sync" : "Offline — writes queue locally"}
    >
      {!online ? (
        <span className="text-ink">Offline</span>
      ) : (
        <span className="tabular text-ink">{pending} not synced</span>
      )}
    </button>
  );
}
