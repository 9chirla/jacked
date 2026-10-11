import { buildCoachReport } from "@/lib/coach/build-coach";
import type { CoachReport, CoachTone, NextSessionPrep } from "@/lib/coach/types";
import { currentWeekStreak } from "@/lib/calculations/streaks";
import { suggestionsForRecentExercises } from "@/lib/progress/progression-data";
import { previousPerformanceSummary } from "@/lib/workout/session-data";
import { requireAuthedUserId } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

const TRACKED_PATTERNS = ["push", "pull", "squat", "hinge", "core"];

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function emptyReport(tone: CoachTone): CoachReport {
  return buildCoachReport({
    tone,
    sessionsTarget: 3,
    sessions7d: 0,
    sessions28d: 0,
    volume7d: 0,
    volume28d: 0,
    volumePrior28d: 0,
    prs7d: 0,
    hardSetsByPattern14d: Object.fromEntries(
      TRACKED_PATTERNS.map((p) => [p, 0]),
    ),
    trackedPatterns: TRACKED_PATTERNS,
    streakWeeks: 0,
    checkInToday: null,
    checkInEnabled: true,
    limitations: null,
    nextSession: null,
  });
}

export async function loadCoachReport() {
  try {
    return await loadCoachReportInner();
  } catch {
    // Never throw into RSC/Suspense — Next 16 Flight overlays then crash on `.stack`.
    return {
      report: emptyReport("analytical"),
      checkInEnabled: true,
      checkInToday: null,
      todayIso: new Date().toISOString().slice(0, 10),
      tone: "analytical" as CoachTone,
      loadError: true as const,
    };
  }
}

async function loadCoachReportInner() {
  const auth = await requireAuthedUserId();
  if (!auth) return null;
  const { supabase, userId } = auth;

  const { data: profile } = await supabase
    .from("profile")
    .select(
      "coaching_tone, sessions_per_week, checkin_enabled, limitations",
    )
    .eq("id", userId)
    .maybeSingle();

  const tone = (profile?.coaching_tone as CoachTone) ?? "analytical";
  const sessionsTarget = profile?.sessions_per_week ?? 3;
  const checkInEnabled = profile?.checkin_enabled ?? true;
  const limitations = (profile?.limitations as string | null) ?? null;

  const { data: sessions } = await supabase
    .from("workout_session")
    .select("id, completed_at, started_at, total_volume, template_id, status")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(120);

  const rows = sessions ?? [];
  const since7 = new Date(daysAgoIso(7)).getTime();
  const since28 = new Date(daysAgoIso(28)).getTime();
  const since56 = new Date(daysAgoIso(56)).getTime();
  const inWindow = (iso: string | null, start: number) => {
    if (!iso) return false;
    return new Date(iso).getTime() >= start;
  };

  const sessions7d = rows.filter((r) =>
    inWindow(r.completed_at ?? r.started_at, since7),
  ).length;
  const sessions28d = rows.filter((r) =>
    inWindow(r.completed_at ?? r.started_at, since28),
  ).length;

  const volume7d = rows
    .filter((r) => inWindow(r.completed_at ?? r.started_at, since7))
    .reduce((s, r) => s + Number(r.total_volume ?? 0), 0);
  const volume28d = rows
    .filter((r) => inWindow(r.completed_at ?? r.started_at, since28))
    .reduce((s, r) => s + Number(r.total_volume ?? 0), 0);
  const volumePrior28d = rows
    .filter((r) => {
      const t = r.completed_at ?? r.started_at;
      if (!t) return false;
      const ms = new Date(t).getTime();
      return ms >= since56 && ms < since28;
    })
    .reduce((s, r) => s + Number(r.total_volume ?? 0), 0);

  let prs7d = 0;
  try {
    const { data: prSets } = await supabase
      .from("exercise_set")
      .select("id")
      .eq("user_id", userId)
      .eq("is_pr", true)
      .gte("completed_at", daysAgoIso(7));
    prs7d = prSets?.length ?? 0;
  } catch {
    prs7d = 0;
  }

  const hardSetsByPattern14d: Record<string, number> = {};
  for (const pattern of TRACKED_PATTERNS) {
    hardSetsByPattern14d[pattern] = 0;
  }
  try {
    const { data: recentSets } = await supabase
      .from("exercise_set")
      .select(
        "id, kind, completed_at, session_exercise!inner(exercise:exercise_id(primary_pattern))",
      )
      .eq("user_id", userId)
      .eq("kind", "working")
      .not("completed_at", "is", null)
      .gte("completed_at", daysAgoIso(14))
      .limit(500);

    for (const row of recentSets ?? []) {
      const se = row.session_exercise as unknown as {
        exercise:
          | { primary_pattern: string | null }
          | { primary_pattern: string | null }[]
          | null;
      };
      const ex = Array.isArray(se.exercise) ? se.exercise[0] : se.exercise;
      const pattern = ex?.primary_pattern;
      if (!pattern || !(pattern in hardSetsByPattern14d)) continue;
      hardSetsByPattern14d[pattern] =
        (hardSetsByPattern14d[pattern] ?? 0) + 1;
    }
  } catch {
    // leave zeros
  }

  const streakWeeks = currentWeekStreak(
    rows.map((r) => ({
      completedAt: r.completed_at as string | null,
      startedAt: r.started_at as string | null,
    })),
  );

  const today = new Date().toISOString().slice(0, 10);
  type CheckInRow = {
    fatigue: number;
    soreness: number;
    sleep: number | null;
    discomfort_text: string | null;
  };
  let checkIn: CheckInRow | null = null;
  const { data: checkInRow, error: checkInError } = await supabase
    .from("daily_check_in")
    .select("fatigue, soreness, sleep, discomfort_text")
    .eq("user_id", userId)
    .eq("logged_date", today)
    .maybeSingle();
  if (!checkInError && checkInRow) {
    checkIn = checkInRow as CheckInRow;
  }

  let nextSession: NextSessionPrep | null = null;
  try {
    nextSession = await resolveNextSessionPrep(
      userId,
      rows[0]?.template_id as string | null,
      checkIn
        ? {
            fatigue: checkIn.fatigue,
            soreness: checkIn.soreness,
          }
        : undefined,
    );
  } catch {
    nextSession = null;
  }

  const report = buildCoachReport({
    tone,
    sessionsTarget,
    sessions7d,
    sessions28d,
    volume7d,
    volume28d,
    volumePrior28d,
    prs7d,
    hardSetsByPattern14d,
    trackedPatterns: TRACKED_PATTERNS,
    streakWeeks,
    checkInToday: checkIn
      ? {
          fatigue: checkIn.fatigue,
          soreness: checkIn.soreness,
          sleep: checkIn.sleep ?? null,
          discomfortText: checkIn.discomfort_text ?? null,
        }
      : null,
    checkInEnabled,
    limitations,
    nextSession,
  });

  return {
    report,
    checkInEnabled,
    checkInToday: checkIn
      ? {
          fatigue: checkIn.fatigue,
          soreness: checkIn.soreness,
          sleep: checkIn.sleep ?? null,
          discomfortText: checkIn.discomfort_text ?? null,
        }
      : null,
    todayIso: today,
    tone,
    loadError: false as const,
  };
}

async function resolveNextSessionPrep(
  userId: string,
  lastTemplateId: string | null,
  modulation?: { fatigue?: number | null; soreness?: number | null },
): Promise<NextSessionPrep | null> {
  const supabase = await createClient();
  const { data: templates } = await supabase
    .from("workout_template")
    .select("id, name, sort_order")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("sort_order");

  if (!templates?.length) return null;

  let pick = templates[0]!;
  let reason = "First active template on file";
  if (lastTemplateId) {
    const idx = templates.findIndex((t) => t.id === lastTemplateId);
    if (idx >= 0) {
      pick = templates[(idx + 1) % templates.length]!;
      const last = templates[idx]!;
      reason = `Last completed session used ${last.name}`;
    }
  }

  const { data: items } = await supabase
    .from("template_item")
    .select("exercise_id, sort_order, exercise:exercise_id(id, name)")
    .eq("template_id", pick.id)
    .order("sort_order");

  let suggestions: Awaited<ReturnType<typeof suggestionsForRecentExercises>> =
    [];
  try {
    suggestions = await suggestionsForRecentExercises(12, modulation);
  } catch {
    suggestions = [];
  }
  const suggestionByEx = new Map(suggestions.map((s) => [s.exerciseId, s]));

  const exercises = [];
  for (const item of (items ?? []).slice(0, 8)) {
    const ex = Array.isArray(item.exercise) ? item.exercise[0] : item.exercise;
    const exerciseId = item.exercise_id as string;
    const name = (ex?.name as string | undefined) ?? "Exercise";
    let lastSummary: string | null = null;
    try {
      const prev = await previousPerformanceSummary(exerciseId);
      lastSummary = prev?.summary ?? null;
    } catch {
      lastSummary = null;
    }
    const sug = suggestionByEx.get(exerciseId);
    const reps = sug?.suggestion.targetReps ?? [];
    exercises.push({
      exerciseId,
      exerciseName: name,
      lastSummary,
      suggestionText: sug
        ? sug.suggestion.kind === "ask_starting_load"
          ? "Enter a starting load when you log"
          : `Suggested ${sug.suggestion.loadKg ?? "—"} kg × ${reps.join("/")}`
        : "No suggestion yet — log working sets first",
      rule: sug?.suggestion.rule ?? "insufficient_history",
    });
  }

  return {
    templateId: pick.id as string,
    templateName: pick.name as string,
    reason,
    exercises,
  };
}
