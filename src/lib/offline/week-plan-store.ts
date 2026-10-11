import { CACHE_KEYS, getCache, setCache } from "@/lib/offline/cache-store";
import type { WeekPlanRecord } from "@/lib/plan/types";

export async function cacheActiveWeekPlan(
  plan: WeekPlanRecord | null,
): Promise<void> {
  await setCache(CACHE_KEYS.weekPlanActive, plan);
}

export async function readCachedWeekPlan(): Promise<WeekPlanRecord | null> {
  return getCache<WeekPlanRecord>(CACHE_KEYS.weekPlanActive);
}
