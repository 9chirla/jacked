const STORAGE_KEY = "jacked.simulateOffline";

let simulateOffline = false;

function readStorage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Call once on client mount to restore the session toggle. */
export function hydrateSimulateOffline(): boolean {
  simulateOffline = readStorage();
  return simulateOffline;
}

export function setSimulateOffline(value: boolean) {
  simulateOffline = value;
  if (typeof window === "undefined") return;
  try {
    if (value) sessionStorage.setItem(STORAGE_KEY, "1");
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore quota / private mode
  }
  window.dispatchEvent(
    new CustomEvent("jacked:network", { detail: { simulateOffline: value } }),
  );
}

export function getSimulateOffline(): boolean {
  return simulateOffline;
}

/** Effective connectivity for outbox / export UI (respects simulate toggle). */
export function isAppOnline(): boolean {
  if (simulateOffline) return false;
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
