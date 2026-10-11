"use client";

import { useSyncStatus } from "@/components/pwa/SyncProvider";

/** Full history search beyond the 90-day cache is online-only. */
export function HistoryOfflineNote() {
  const { online } = useSyncStatus();
  if (online) return null;
  return (
    <p className="text-[14px] text-muted" role="status">
      Offline: showing this device&apos;s cached sessions only. Full history
      search beyond cache is unavailable offline.
    </p>
  );
}
