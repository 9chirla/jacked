/** Exponential backoff with jitter. Cap at 15 minutes. */
export function nextBackoffMs(attempts: number, now = Date.now()): number {
  const base = Math.min(15 * 60_000, 1000 * 2 ** Math.min(attempts, 10));
  const jitter = Math.floor(Math.random() * Math.min(1000, base * 0.2));
  return now + base + jitter;
}

export function isDue(nextAttemptAt: string | null | undefined, now = Date.now()): boolean {
  if (!nextAttemptAt) return true;
  return Date.parse(nextAttemptAt) <= now;
}
