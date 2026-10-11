"use server";

import { applyCompletion, markPastPlannedMissed } from "@/lib/plan/completion";
import { planWeek } from "@/lib/plan/plan-week";
import { rescheduleMissed } from "@/lib/plan/reschedule";
import type { PlannedDay, TemplateRef, Weekday } from "@/lib/plan/types";
import {
  localDateString,
  weekStartFor,
} from "@/lib/plan/week";
import { requireAuthedUserId } from "@/lib/supabase/auth";
import { upsertWeekPlanSchema } from "@/lib/validation/week-plan";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult =
  | { ok: true; id?: string; data?: unknown }
  | { ok: false; error: string };

function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    weekStart: row.week_start as string,
    timezone: row.timezone as string,
    availableDays: (row.available_days as number[]) ?? [],
    plannedDays: (row.planned_days as PlannedDay[]) ?? [],
    status: row.status as string,
    clientUpdatedAt: row.client_updated_at as string,
    updatedAt: row.updated_at as string | undefined,
  };
}

export async function getWeekPlan(weekStart: string): Promise<ActionResult> {
  const auth = await requireAuthedUserId();
  if (!auth) return { ok: false, error: "Sign in required." };

  const { data, error } = await auth.supabase
    .from("week_plan")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ? mapRow(data as Record<string, unknown>) : null };
}

export async function upsertWeekPlan(input: unknown): Promise<ActionResult> {
  const parsed = upsertWeekPlanSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const auth = await requireAuthedUserId();
  if (!auth) return { ok: false, error: "Sign in required." };

  const clientUpdatedAt =
    parsed.data.client_updated_at ?? new Date().toISOString();

  // Last-write-wins: reject stale client if server is newer.
  const { data: existing } = await auth.supabase
    .from("week_plan")
    .select("id, client_updated_at")
    .eq("user_id", auth.userId)
    .eq("week_start", parsed.data.week_start)
    .maybeSingle();

  if (
    existing?.client_updated_at &&
    parsed.data.client_updated_at &&
    new Date(existing.client_updated_at).getTime() >
      new Date(parsed.data.client_updated_at).getTime()
  ) {
    return {
      ok: false,
      error: "Server has a newer plan copy. Refresh and try again.",
    };
  }

  const payload = {
    id: parsed.data.id ?? existing?.id,
    user_id: auth.userId,
    week_start: parsed.data.week_start,
    timezone: parsed.data.timezone,
    available_days: parsed.data.available_days,
    planned_days: parsed.data.planned_days,
    status: parsed.data.status,
    client_updated_at: clientUpdatedAt,
  };

  const { data, error } = await auth.supabase
    .from("week_plan")
    .upsert(payload, { onConflict: "user_id,week_start" })
    .select("*")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save plan." };
  }

  revalidatePath("/today");
  revalidatePath("/plan");
  return { ok: true, id: data.id as string, data: mapRow(data as Record<string, unknown>) };
}

export async function buildPlanPreview(input: {
  weekStart: string;
  availableDays: Weekday[];
  timezone: string;
  today?: string;
}): Promise<ActionResult> {
  const auth = await requireAuthedUserId();
  if (!auth) return { ok: false, error: "Sign in required." };

  const today =
    input.today ?? localDateString(new Date(), input.timezone || "UTC");

  const { data: templates } = await auth.supabase
    .from("workout_template")
    .select("id, name, sort_order, day_label")
    .eq("user_id", auth.userId)
    .eq("is_active", true)
    .order("sort_order");

  const refs: TemplateRef[] = (templates ?? []).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    sortOrder: Number(t.sort_order),
    dayLabel: t.day_label as string | null,
  }));

  const { data: last } = await auth.supabase
    .from("workout_session")
    .select("template_id")
    .eq("user_id", auth.userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planned = planWeek({
    weekStart: input.weekStart,
    availableDays: input.availableDays,
    templates: refs,
    lastCompletedTemplateId: (last?.template_id as string) ?? null,
    today,
  });

  return {
    ok: true,
    data: {
      plannedDays: planned,
      templates: refs,
      note:
        input.availableDays.length < 3
          ? `Only ${input.availableDays.length} free day(s): planning ${planned.length} session(s).`
          : input.availableDays.length > 3
            ? "Picked best 3 spread out; change free days or swap if you prefer."
            : null,
    },
  };
}

export async function rescheduleActiveWeek(): Promise<ActionResult> {
  const auth = await requireAuthedUserId();
  if (!auth) return { ok: false, error: "Sign in required." };

  const { data: existingForTz } = await auth.supabase
    .from("week_plan")
    .select("timezone")
    .eq("user_id", auth.userId)
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  const tz = (existingForTz?.timezone as string) || "UTC";
  const today = localDateString(new Date(), tz);
  const weekStart = weekStartFor(today, tz);

  const { data: plan } = await auth.supabase
    .from("week_plan")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (!plan) return { ok: false, error: "No plan for this week." };

  const { data: templates } = await auth.supabase
    .from("workout_template")
    .select("id, name, sort_order, day_label")
    .eq("user_id", auth.userId)
    .eq("is_active", true)
    .order("sort_order");

  const refs: TemplateRef[] = (templates ?? []).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    sortOrder: Number(t.sort_order),
    dayLabel: t.day_label as string | null,
  }));

  let plannedDays = markPastPlannedMissed(
    (plan.planned_days as PlannedDay[]) ?? [],
    today,
  );
  plannedDays = rescheduleMissed({
    weekStart,
    plannedDays,
    availableDays: (plan.available_days as Weekday[]) ?? [],
    templates: refs,
    today,
    lastCompletedTemplateId: null,
  });

  return upsertWeekPlan({
    id: plan.id,
    week_start: weekStart,
    timezone: plan.timezone,
    available_days: plan.available_days,
    planned_days: plannedDays,
    status: "active",
    client_updated_at: new Date().toISOString(),
  });
}

export async function startPlanSession(input: {
  templateId: string;
  weekStart: string;
  date: string;
}): Promise<ActionResult> {
  const auth = await requireAuthedUserId();
  if (!auth) return { ok: false, error: "Sign in required." };

  const { data: plan } = await auth.supabase
    .from("week_plan")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("week_start", input.weekStart)
    .maybeSingle();

  if (plan) {
    const days = ((plan.planned_days as PlannedDay[]) ?? []).map((d) =>
      d.date === input.date
        ? { ...d, templateId: input.templateId }
        : d,
    );
    await auth.supabase
      .from("week_plan")
      .update({
        planned_days: days,
        client_updated_at: new Date().toISOString(),
      })
      .eq("id", plan.id);
  }

  // Re-implement start without redirect so we can attach session id.
  const { data: template } = await auth.supabase
    .from("workout_template")
    .select("id")
    .eq("id", input.templateId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!template) return { ok: false, error: "Template not found." };

  const { data: items } = await auth.supabase
    .from("template_item")
    .select(
      "exercise_id, sort_order, target_sets, target_reps_low, target_reps_high, rest_seconds, note",
    )
    .eq("template_id", input.templateId)
    .order("sort_order");

  const { data: session, error } = await auth.supabase
    .from("workout_session")
    .insert({
      user_id: auth.userId,
      template_id: input.templateId,
      status: "in_progress",
      started_at: new Date().toISOString(),
      client_uuid: crypto.randomUUID(),
      scheduled_for: input.date,
    })
    .select("id")
    .maybeSingle();

  if (error || !session) {
    return { ok: false, error: error?.message ?? "Could not start." };
  }

  if (items && items.length > 0) {
    const { error: seError } = await auth.supabase.from("session_exercise").insert(
      items.map((item) => ({
        session_id: session.id,
        exercise_id: item.exercise_id,
        sort_order: item.sort_order,
        target_note:
          item.note ||
          [
            item.target_sets ? `${item.target_sets} sets` : null,
            item.target_reps_low && item.target_reps_high
              ? `${item.target_reps_low}–${item.target_reps_high} reps`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || null,
      })),
    );
    if (seError) {
      await auth.supabase.from("workout_session").delete().eq("id", session.id);
      return { ok: false, error: seError.message };
    }
  }

  if (plan) {
    const days = ((plan.planned_days as PlannedDay[]) ?? []).map((d) =>
      d.date === input.date
        ? { ...d, templateId: input.templateId, sessionId: session.id as string }
        : d,
    );
    await auth.supabase
      .from("week_plan")
      .update({
        planned_days: days,
        client_updated_at: new Date().toISOString(),
      })
      .eq("id", plan.id);
  }

  revalidatePath("/today");
  revalidatePath("/log");
  redirect(`/log/${session.id}`);
}

/** Called after a session is completed — updates this week's plan. */
export async function applySessionToWeekPlan(sessionId: string): Promise<void> {
  const auth = await requireAuthedUserId();
  if (!auth) return;

  const { data: session } = await auth.supabase
    .from("workout_session")
    .select("id, template_id, status, completed_at, scheduled_for")
    .eq("id", sessionId)
    .eq("user_id", auth.userId)
    .maybeSingle();
  if (!session || session.status !== "completed" || !session.template_id) return;

  const { data: recentPlan } = await auth.supabase
    .from("week_plan")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("status", "active")
    .order("week_start", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!recentPlan) return;

  const tz = (recentPlan.timezone as string) || "UTC";
  const completedDate = session.completed_at
    ? localDateString(new Date(session.completed_at as string), tz)
    : (session.scheduled_for as string) || localDateString(new Date(), tz);
  const weekStart = weekStartFor(completedDate, tz);

  const { data: plan } =
    recentPlan.week_start === weekStart
      ? { data: recentPlan }
      : await auth.supabase
          .from("week_plan")
          .select("*")
          .eq("user_id", auth.userId)
          .eq("week_start", weekStart)
          .maybeSingle();
  if (!plan) return;

  const plannedDays = applyCompletion((plan.planned_days as PlannedDay[]) ?? [], {
    sessionId: session.id as string,
    templateId: session.template_id as string,
    completedDate,
    status: "completed",
  });

  await auth.supabase
    .from("week_plan")
    .update({
      planned_days: plannedDays,
      client_updated_at: new Date().toISOString(),
      status: plannedDays.every(
        (d) => d.status === "done" || d.status === "skipped",
      )
        ? "completed"
        : "active",
    })
    .eq("id", plan.id);

  revalidatePath("/today");
  revalidatePath("/plan");
}
