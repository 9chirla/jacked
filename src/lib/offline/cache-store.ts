import { getJackedDb, type CacheEntry } from "@/lib/offline/db";

export const CACHE_KEYS = {
  profile: "profile",
  exercises: "exercises",
  weighIns: "weighIns",
  sessions90d: "sessions90d",
  weekPlanActive: "weekPlanActive",
  seededAt: "seededAt",
} as const;

export async function setCache(key: string, value: unknown): Promise<void> {
  const db = await getJackedDb();
  const entry: CacheEntry = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  };
  await db.put("cache", entry);
}

export async function getCache<T>(key: string): Promise<T | null> {
  const db = await getJackedDb();
  const entry = await db.get("cache", key);
  return (entry?.value as T) ?? null;
}

export async function getCacheMeta(key: string): Promise<CacheEntry | null> {
  const db = await getJackedDb();
  return (await db.get("cache", key)) ?? null;
}
