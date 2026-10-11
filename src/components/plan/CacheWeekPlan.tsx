"use client";

import { cacheActiveWeekPlan } from "@/lib/offline/week-plan-store";
import type { WeekPlanRecord } from "@/lib/plan/types";
import { useEffect } from "react";

/** Seed IDB with the active week plan whenever Today/Plan hydrate online. */
export function CacheWeekPlan({ plan }: { plan: WeekPlanRecord | null }) {
  useEffect(() => {
    void cacheActiveWeekPlan(plan);
  }, [plan]);
  return null;
}
