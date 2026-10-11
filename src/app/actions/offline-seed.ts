"use server";

import { createClient } from "@/lib/supabase/server";

export type OfflineSeed = {
  profile: Record<string, unknown> | null;
  exercises: Record<string, unknown>[];
  weighIns: Record<string, unknown>[];
  sessions: Record<string, unknown>[];
  weekPlan: Record<string, unknown> | null;
  seededAt: string;
};

export async function getOfflineSeed(): Promise<
  | { ok: true; data: OfflineSeed }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const since = new Date();
  since.setDate(since.getDate() - 90);

  const [profileRes, exercisesRes, weighRes, sessionsRes, weekPlanRes] =
    await Promise.all([
      supabase.from("profile").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("exercise")
        .select(
          "id, name, slug, category, primary_pattern, metric, is_bodyweight, is_custom, archived_at",
        )
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("name"),
      supabase
        .from("body_weight_entry")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_date", { ascending: false }),
      supabase
        .from("workout_session")
        .select(
          "id, template_id, status, started_at, completed_at, total_volume, total_reps, total_working_sets, updated_at",
        )
        .eq("user_id", user.id)
        .gte("started_at", since.toISOString())
        .order("started_at", { ascending: false })
        .limit(120),
      supabase
        .from("week_plan")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("week_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (profileRes.error) {
    return { ok: false, error: profileRes.error.message };
  }

  return {
    ok: true,
    data: {
      profile: (profileRes.data as Record<string, unknown>) ?? null,
      exercises: (exercisesRes.data ?? []) as Record<string, unknown>[],
      weighIns: (weighRes.data ?? []) as Record<string, unknown>[],
      sessions: (sessionsRes.data ?? []) as Record<string, unknown>[],
      weekPlan: (weekPlanRes.data as Record<string, unknown>) ?? null,
      seededAt: new Date().toISOString(),
    },
  };
}
