import { createClient } from "@/lib/supabase/server";

type Prefill = { load: number | null; reps: number | null };

export async function loadPreviousWorkingSets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  exerciseId: string,
  excludeSessionId: string,
): Promise<Prefill[]> {
  const { data: candidates } = await supabase
    .from("session_exercise")
    .select("id, session_id")
    .eq("exercise_id", exerciseId)
    .neq("session_id", excludeSessionId)
    .order("id", { ascending: false })
    .limit(40);

  for (const candidate of candidates ?? []) {
    const { data: sess } = await supabase
      .from("workout_session")
      .select("id, user_id, status")
      .eq("id", candidate.session_id)
      .maybeSingle();
    if (!sess || sess.user_id !== userId || sess.status !== "completed") {
      continue;
    }
    const { data: sets } = await supabase
      .from("exercise_set")
      .select("load, reps, set_number")
      .eq("session_exercise_id", candidate.id)
      .eq("kind", "working")
      .order("set_number");
    if (sets?.length) {
      return sets.map((s) => ({
        load: s.load == null ? null : Number(s.load),
        reps: s.reps,
      }));
    }
  }
  return [];
}

export async function previousPerformanceSummary(
  exerciseId: string,
  excludeSessionId = "00000000-0000-0000-0000-000000000000",
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sets = await loadPreviousWorkingSets(
    supabase,
    user.id,
    exerciseId,
    excludeSessionId,
  );
  if (!sets.length) return null;
  return {
    summary: sets.map((s) => `${s.load ?? "—"}×${s.reps ?? "—"}`).join(", "),
    sets,
  };
}

/** Seed empty session exercises with 3 working rows (prefilled when history exists). */
export async function seedDefaultSets(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in required." };

  const { data: session } = await supabase
    .from("workout_session")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) return { ok: false as const, error: "Session not found." };

  const { data: exercises } = await supabase
    .from("session_exercise")
    .select("id, exercise_id, sort_order")
    .eq("session_id", sessionId)
    .order("sort_order");

  for (const se of exercises ?? []) {
    const { count } = await supabase
      .from("exercise_set")
      .select("*", { count: "exact", head: true })
      .eq("session_exercise_id", se.id);
    if ((count ?? 0) > 0) continue;

    const prefills = await loadPreviousWorkingSets(
      supabase,
      user.id,
      se.exercise_id,
      sessionId,
    );

    const targetCount = Math.max(3, prefills.length || 3);
    const rows = Array.from({ length: targetCount }, (_, i) => ({
      session_exercise_id: se.id,
      user_id: user.id,
      set_number: i + 1,
      kind: "working" as const,
      load: prefills[i]?.load ?? null,
      reps: prefills[i]?.reps ?? null,
      source: prefills[i] ? ("prefill" as const) : ("manual" as const),
      completed_at: null as string | null,
    }));

    const { error } = await supabase.from("exercise_set").insert(rows);
    if (error) return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
