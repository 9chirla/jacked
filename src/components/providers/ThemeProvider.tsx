"use client";

import {
  THEME_STORAGE_KEY,
  resolveTheme,
  type ThemePreference,
} from "@/lib/theme";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type ThemeContextValue = {
  preference: ThemePreference;
  resolved: "light" | "dark";
  setPreference: (next: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const listeners = new Set<() => void>();

/** Primitive snapshot — useSyncExternalStore compares with Object.is. */
const SERVER_SNAPSHOT = "system|light";

function emitThemeChange() {
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore
  }
  return "system";
}

function getSnapshot(): string {
  const preference = readPreference();
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(preference, systemDark);
  return `${preference}|${resolved}`;
}

function getServerSnapshot(): string {
  return SERVER_SNAPSHOT;
}

function parseSnapshot(snapshot: string): {
  preference: ThemePreference;
  resolved: "light" | "dark";
} {
  const safe = snapshot || SERVER_SNAPSHOT;
  const [preference, resolved] = safe.split("|") as [
    ThemePreference,
    "light" | "dark",
  ];
  return {
    preference: preference || "system",
    resolved: resolved === "dark" ? "dark" : "light",
  };
}

function applyDomTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute(
      "content",
      resolved === "dark" ? "#0E110D" : "#F7F8F6",
    );
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const { preference, resolved } = parseSnapshot(snapshot);

  useEffect(() => {
    applyDomTheme(resolved);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    emitThemeChange();
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
