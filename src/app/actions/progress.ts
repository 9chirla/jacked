"use server";

import {
  measurementSchema,
  progressionOverrideSchema,
  weighInSchema,
} from "@/lib/validation/weight";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function assertNotFuture(dateStr: string): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (dateStr > today) return "Future dates are not allowed.";
  const oldest = new Date();
  oldest.setUTCDate(oldest.getUTCDate() - 90);
  if (dateStr < oldest.toISOString().slice(0, 10)) {
    return "Date is older than the 90-day backdate limit.";
  }
  return null;
}

export async function upsertWeighIn(input: unknown): Promise<ActionResult> {
  const parsed = weighInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const future = assertNotFuture(parsed.data.logged_date);
  if (future) return { ok: false, error: future };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const loggedAt = `${parsed.data.logged_date}T12:00:00.000Z`;
  const { data, error } = await supabase
    .from("body_weight_entry")
    .upsert(
      {
        user_id: user.id,
        logged_date: parsed.data.logged_date,
        logged_at: loggedAt,
        weight_kg: parsed.data.weight_kg,
        context: parsed.data.context ?? null,
        note: parsed.data.note ?? null,
        source: "manual",
      },
      { onConflict: "user_id,logged_date" },
    )
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save weigh-in." };
  }

  revalidatePath("/progress");
  revalidatePath("/today");
  return { ok: true, id: data.id };
}

export async function deleteWeighIn(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { error } = await supabase
    .from("body_weight_entry")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/progress");
  revalidatePath("/today");
  return { ok: true, id };
}

export async function deleteMeasurement(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { error } = await supabase
    .from("body_measurement")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/progress");
  return { ok: true, id };
}

export async function upsertMeasurement(input: unknown): Promise<ActionResult> {
  const parsed = measurementSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const future = assertNotFuture(parsed.data.logged_date);
  if (future) return { ok: false, error: future };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data, error } = await supabase
    .from("body_measurement")
    .upsert(
      {
        user_id: user.id,
        logged_date: parsed.data.logged_date,
        site: parsed.data.site,
        value_cm: parsed.data.value_cm,
        note: parsed.data.note ?? null,
      },
      { onConflict: "user_id,logged_date,site" },
    )
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save measurement." };
  }

  revalidatePath("/progress");
  return { ok: true, id: data.id };
}

export async function saveProgressionOverride(
  input: unknown,
): Promise<ActionResult> {
  const parsed = progressionOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data, error } = await supabase
    .from("progression_override")
    .upsert(
      {
        user_id: user.id,
        exercise_id: parsed.data.exerciseId,
        load: parsed.data.load,
        target_reps_low: parsed.data.target_reps_low ?? null,
        target_reps_high: parsed.data.target_reps_high ?? null,
        note: parsed.data.note ?? null,
      },
      { onConflict: "user_id,exercise_id" },
    )
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not save override." };
  }

  revalidatePath("/progress");
  revalidatePath("/log", "layout");
  return { ok: true, id: data.id };
}

export async function clearProgressionOverride(
  exerciseId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { error } = await supabase
    .from("progression_override")
    .delete()
    .eq("user_id", user.id)
    .eq("exercise_id", exerciseId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/progress");
  return { ok: true };
}
