"use server";

import {
  onboardingSchema,
  profileSettingsSchema,
} from "@/lib/validation/profile";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function completeOnboarding(
  input: unknown,
): Promise<ActionResult> {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const data = parsed.data;
  const { data: updated, error } = await supabase
    .from("profile")
    .update({
      display_name: data.display_name ?? null,
      primary_goal: data.primary_goal,
      goals: data.goals,
      experience_level: data.experience_level,
      equipment_kind: data.equipment_kind,
      training_location: data.training_location || "Commercial gym",
      current_routine: data.current_routine || null,
      limitations: data.limitations || null,
      sessions_per_week: data.sessions_per_week,
      session_minutes: data.session_minutes,
      preferred_days: data.preferred_days ?? null,
      mass_unit: data.mass_unit,
      length_unit: data.length_unit,
      height_cm: data.height_cm ?? null,
      target_weight_kg: data.target_weight_kg,
      weight_change_rate_kg_per_week: data.weight_change_rate_kg_per_week,
      logging_detail: data.logging_detail,
      coaching_tone: data.coaching_tone,
      theme: data.theme,
      progression_model: data.progression_model,
      rest_timer_enabled: data.rest_timer_enabled,
      checkin_enabled: data.checkin_enabled,
      cardio_separate: data.cardio_separate,
      prefill_last: data.prefill_last,
      timeframe_months: data.timeframe_months,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!updated) {
    return { ok: false, error: "Profile not found for this account." };
  }

  await supabase
    .from("equipment")
    .update({ is_active: false })
    .eq("user_id", user.id);

  const { data: equipmentRow } = await supabase
    .from("equipment")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", data.equipment_kind)
    .maybeSingle();

  if (equipmentRow) {
    await supabase
      .from("equipment")
      .update({
        is_active: true,
        detail:
          data.equipment_kind === "commercial_gym"
            ? "Full commercial gym"
            : data.equipment_kind,
      })
      .eq("id", equipmentRow.id)
      .select("id")
      .maybeSingle();
  } else {
    await supabase.from("equipment").insert({
      user_id: user.id,
      kind: data.equipment_kind,
      detail:
        data.equipment_kind === "commercial_gym"
          ? "Full commercial gym"
          : data.equipment_kind,
      is_active: true,
    });
  }

  const { data: existingGoal } = await supabase
    .from("goal")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", "body_weight")
    .eq("status", "active")
    .maybeSingle();

  if (existingGoal) {
    await supabase
      .from("goal")
      .update({
        baseline_value: data.current_weight_kg,
        target_value: data.target_weight_kg,
        target_unit: "kg",
      })
      .eq("id", existingGoal.id)
      .select("id")
      .maybeSingle();
  } else {
    await supabase.from("goal").insert({
      user_id: user.id,
      kind: "body_weight",
      baseline_value: data.current_weight_kg,
      target_value: data.target_weight_kg,
      target_unit: "kg",
      status: "active",
    });
  }

  // Seed first weigh-in from onboarding current weight (idempotent per date).
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("body_weight_entry").upsert(
    {
      user_id: user.id,
      logged_date: today,
      logged_at: `${today}T12:00:00.000Z`,
      weight_kg: data.current_weight_kg,
      context: null,
      source: "onboarding",
    },
    { onConflict: "user_id,logged_date" },
  );

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateProfileSettings(
  input: unknown,
): Promise<ActionResult> {
  const parsed = profileSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Invalid settings.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in required." };
  }

  const { data: updated, error } = await supabase
    .from("profile")
    .update(parsed.data)
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: error.message };
  }
  if (!updated) {
    return { ok: false, error: "No profile row updated." };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profile")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}
