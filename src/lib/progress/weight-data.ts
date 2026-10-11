import {
  currentWeekStreak,
  sessionsInIsoWeek,
} from "@/lib/calculations/streaks";
import { requireAuthedUserId } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export async function listWeighIns(limit = 120) {
  const auth = await requireAuthedUserId();
  if (!auth) return [];

  const { data } = await auth.supabase
    .from("body_weight_entry")
    .select("id, logged_date, weight_kg, context, note")
    .eq("user_id", auth.userId)
    .order("logged_date", { ascending: true })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    date: row.logged_date as string,
    weightKg: Number(row.weight_kg),
    context: row.context as string | null,
    note: row.note as string | null,
  }));
}

export async function listMeasurements(limit = 80) {
  const auth = await requireAuthedUserId();
  if (!auth) return [];

  const { data } = await auth.supabase
    .from("body_measurement")
    .select("id, logged_date, site, value_cm, note")
    .eq("user_id", auth.userId)
    .order("logged_date", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    date: row.logged_date as string,
    site: row.site as string,
    valueCm: Number(row.value_cm),
    note: row.note as string | null,
  }));
}

export async function sessionStats(userId: string, sessionsPerWeek: number) {
  const supabase = await createClient();
  const { data: completed } = await supabase
    .from("workout_session")
    .select("id, completed_at, started_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(60);

  const rows = (completed ?? []).map((r) => ({
    completedAt: r.completed_at as string | null,
    startedAt: r.started_at as string | null,
  }));

  return {
    sessionsThisWeek: sessionsInIsoWeek(rows),
    sessionsTarget: sessionsPerWeek,
    streakWeeks: currentWeekStreak(rows),
  };
}
