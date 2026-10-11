"use client";

import { flushOutbox } from "@/lib/offline/flush";
import { countPendingOutbox } from "@/lib/offline/outbox";
import { getOfflineSeed } from "@/app/actions/offline-seed";
import { CACHE_KEYS, setCache } from "@/lib/offline/cache-store";
import {
  getSimulateOffline,
  hydrateSimulateOffline,
  isAppOnline,
  setSimulateOffline,
} from "@/lib/offline/network";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type FlushNowResult = {
  flushed: number;
  remaining: number;
  lastError: string | null;
};

type SyncContextValue = {
  online: boolean;
  simulateOffline: boolean;
  setSimulateOfflineMode: (value: boolean) => void;
  pending: number;
  lastFlushAt: string | null;
  lastSyncError: string | null;
  refreshPending: () => Promise<void>;
  flushNow: () => Promise<FlushNowResult>;
};

const SyncContext = createContext<SyncContextValue | null>(null);
const SEED_COOLDOWN_MS = 5 * 60_000;

export function useSyncStatus() {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    return {
      online: true,
      simulateOffline: false,
      setSimulateOfflineMode: (_value: boolean) => {},
      pending: 0,
      lastFlushAt: null,
      lastSyncError: null,
      refreshPending: async () => {},
      flushNow: async () => ({ flushed: 0, remaining: 0, lastError: null }),
    };
  }
  return ctx;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [simulateOffline, setSimulateState] = useState(false);
  const [pending, setPending] = useState(0);
  const [lastFlushAt, setLastFlushAt] = useState<string | null>(null);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  const refreshOnline = useCallback(() => {
    setOnline(isAppOnline());
    setSimulateState(getSimulateOffline());
  }, []);

  const refreshPending = useCallback(async () => {
    try {
      setPending(await countPendingOutbox());
    } catch {
      // IDB unavailable
    }
  }, []);

  const flushNow = useCallback(async (): Promise<FlushNowResult> => {
    try {
      const summary = await flushOutbox({ force: true });
      setLastFlushAt(new Date().toISOString());
      setLastSyncError(summary.lastError);
      await refreshPending();
      return {
        flushed: summary.flushed,
        remaining: summary.remaining,
        lastError: summary.lastError,
      };
    } catch (e) {
      const lastError = e instanceof Error ? e.message : "Sync failed";
      setLastSyncError(lastError);
      await refreshPending();
      return { flushed: 0, remaining: pending, lastError };
    }
  }, [refreshPending, pending]);

  const setSimulateOfflineMode = useCallback(
    (value: boolean) => {
      setSimulateOffline(value);
      refreshOnline();
      if (!value) {
        // Defer so we don't interleave server actions with an in-flight RSC tree.
        window.setTimeout(() => {
          void flushNow();
        }, 300);
      }
    },
    [refreshOnline, flushNow],
  );

  useEffect(() => {
    hydrateSimulateOffline();
    refreshOnline();
    void refreshPending();

    const onOnline = () => {
      refreshOnline();
      if (isAppOnline()) {
        window.setTimeout(() => {
          void flushOutbox().then(() => refreshPending());
        }, 500);
      }
    };
    const onOffline = () => refreshOnline();
    const onSim = () => refreshOnline();

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("jacked:network", onSim);

    // Delayed background flush — avoids Flight races right after navigation.
    const bootFlush = window.setTimeout(() => {
      if (isAppOnline()) {
        void flushOutbox().then(() => refreshPending());
      }
    }, 2000);

    const id = window.setInterval(() => {
      if (isAppOnline()) void flushOutbox().then(() => refreshPending());
    }, 60_000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("jacked:network", onSim);
      window.clearTimeout(bootFlush);
      window.clearInterval(id);
    };
  }, [refreshPending, refreshOnline]);

  useEffect(() => {
    if (!online) return;
    const bootSeed = window.setTimeout(() => {
      void (async () => {
        try {
          const last = sessionStorage.getItem("jacked.seedAt");
          if (last && Date.now() - Date.parse(last) < SEED_COOLDOWN_MS) return;
          const result = await getOfflineSeed();
          if (!result.ok) return;
          await setCache(CACHE_KEYS.profile, result.data.profile);
          await setCache(CACHE_KEYS.exercises, result.data.exercises);
          await setCache(CACHE_KEYS.weighIns, result.data.weighIns);
          await setCache(CACHE_KEYS.sessions90d, result.data.sessions);
          await setCache(CACHE_KEYS.seededAt, result.data.seededAt);
          sessionStorage.setItem("jacked.seedAt", new Date().toISOString());
        } catch {
          // Seed is best-effort; never surface into the Flight tree.
        }
      })();
    }, 2500);
    return () => window.clearTimeout(bootSeed);
  }, [online]);

  const value = useMemo(
    () => ({
      online,
      simulateOffline,
      setSimulateOfflineMode,
      pending,
      lastFlushAt,
      lastSyncError,
      refreshPending,
      flushNow,
    }),
    [
      online,
      simulateOffline,
      setSimulateOfflineMode,
      pending,
      lastFlushAt,
      lastSyncError,
      refreshPending,
      flushNow,
    ],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}
