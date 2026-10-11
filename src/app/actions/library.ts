"use server";

import { slugify } from "@/lib/slug";
import { createExerciseSchema } from "@/lib/validation/exercise";
import { createClient } from "@/lib/supabase/server";
import { ensureLibrarySeeded as seedLibrary } from "@/lib/workout/ensure-library";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null as null };
  return { supabase, user };
}

/** Client-callable wrapper; pages should import `@/lib/workout/ensure-library`. */
export async function ensureLibrarySeeded(): Promise<ActionResult> {
  const result = await seedLibrary();
  if (result.ok) revalidatePath("/", "layout");
  return result;
}

export async function createCustomExercise(
  input: unknown,
): Promise<ActionResult> {
  const parsed = createExerciseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const base = slugify(parsed.data.name) || "exercise";
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const { data, error } = await supabase
      .from("exercise")
      .insert({
        user_id: user.id,
        name: parsed.data.name,
        slug,
        category: parsed.data.category,
        primary_pattern: parsed.data.primary_pattern ?? null,
        muscle_groups: parsed.data.muscle_groups,
        equipment_required: parsed.data.equipment_required,
        metric: parsed.data.metric,
        is_bodyweight: parsed.data.is_bodyweight,
        is_custom: true,
        rep_range_low: parsed.data.rep_range_low ?? null,
        rep_range_high: parsed.data.rep_range_high ?? null,
        default_rest_seconds: parsed.data.default_rest_seconds,
        notes: parsed.data.notes ?? null,
      })
      .select("id")
      .maybeSingle();

    if (!error && data) {
      revalidatePath("/exercises");
      return { ok: true, id: data.id };
    }
    if (error?.code === "23505") {
      slug = `${base}-${i + 2}`;
      continue;
    }
    return { ok: false, error: error?.message ?? "Could not create exercise." };
  }
  return { ok: false, error: "Could not allocate a unique slug." };
}

export async function archiveExercise(exerciseId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data, error } = await supabase
    .from("exercise")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", exerciseId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Exercise not found or already archived." };
  revalidatePath("/exercises");
  return { ok: true, id: data.id };
}

export async function createTemplate(name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required." };

  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data, error } = await supabase
    .from("workout_template")
    .insert({
      user_id: user.id,
      name: trimmed,
      day_label: trimmed,
      sort_order: 99,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not create template." };
  }
  revalidatePath("/templates");
  revalidatePath("/today");
  return { ok: true, id: data.id };
}

export async function duplicateTemplate(
  templateId: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data: source, error: sourceError } = await supabase
    .from("workout_template")
    .select("id, name, day_label, sort_order")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (sourceError || !source) {
    return { ok: false, error: sourceError?.message ?? "Template not found." };
  }

  const { data: items, error: itemsError } = await supabase
    .from("template_item")
    .select(
      "exercise_id, sort_order, target_sets, target_reps_low, target_reps_high, target_load, target_rpe, rest_seconds, note",
    )
    .eq("template_id", templateId)
    .order("sort_order");

  if (itemsError) return { ok: false, error: itemsError.message };

  const { data: copy, error: copyError } = await supabase
    .from("workout_template")
    .insert({
      user_id: user.id,
      name: `${source.name} (copy)`,
      day_label: source.day_label,
      sort_order: (source.sort_order ?? 0) + 1,
    })
    .select("id")
    .maybeSingle();

  if (copyError || !copy) {
    return { ok: false, error: copyError?.message ?? "Duplicate failed." };
  }

  if (items && items.length > 0) {
    const { error: insertItemsError } = await supabase
      .from("template_item")
      .insert(
        items.map((item) => ({
          ...item,
          template_id: copy.id,
        })),
      );
    if (insertItemsError) {
      await supabase.from("workout_template").delete().eq("id", copy.id);
      return { ok: false, error: insertItemsError.message };
    }
  }

  revalidatePath("/templates");
  return { ok: true, id: copy.id };
}

export async function deleteTemplate(templateId: string): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data, error } = await supabase
    .from("workout_template")
    .delete()
    .eq("id", templateId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Template not found." };
  revalidatePath("/templates");
  revalidatePath("/today");
  return { ok: true, id: data.id };
}

export async function startTemplateSession(templateId: string) {
  const { supabase, user } = await requireUser();
  if (!user) {
    redirect("/login");
  }

  const { data: template } = await supabase
    .from("workout_template")
    .select("id, name")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!template) {
    return { ok: false as const, error: "Template not found." };
  }

  const { data: items } = await supabase
    .from("template_item")
    .select("exercise_id, sort_order, target_sets, target_reps_low, target_reps_high, rest_seconds, note")
    .eq("template_id", templateId)
    .order("sort_order");

  const clientUuid = crypto.randomUUID();
  const { data: session, error } = await supabase
    .from("workout_session")
    .insert({
      user_id: user.id,
      template_id: templateId,
      status: "in_progress",
      started_at: new Date().toISOString(),
      client_uuid: clientUuid,
    })
    .select("id")
    .maybeSingle();

  if (error || !session) {
    return { ok: false as const, error: error?.message ?? "Could not start." };
  }

  if (items && items.length > 0) {
    const { error: seError } = await supabase.from("session_exercise").insert(
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
      await supabase.from("workout_session").delete().eq("id", session.id);
      return { ok: false as const, error: seError.message };
    }
  }

  revalidatePath("/log");
  revalidatePath("/today");
  redirect(`/log/${session.id}`);
}

export async function addExerciseToTemplate(
  templateId: string,
  exerciseId: string,
): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data: template } = await supabase
    .from("workout_template")
    .select("id")
    .eq("id", templateId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!template) return { ok: false, error: "Template not found." };

  const { data: exercise } = await supabase
    .from("exercise")
    .select("id, default_rest_seconds, rep_range_low, rep_range_high")
    .eq("id", exerciseId)
    .eq("user_id", user.id)
    .is("archived_at", null)
    .maybeSingle();
  if (!exercise) return { ok: false, error: "Exercise not found." };

  const { data: last } = await supabase
    .from("template_item")
    .select("sort_order")
    .eq("template_id", templateId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("template_item")
    .insert({
      template_id: templateId,
      exercise_id: exerciseId,
      sort_order: (last?.sort_order ?? -1) + 1,
      target_sets: 3,
      target_reps_low: exercise.rep_range_low,
      target_reps_high: exercise.rep_range_high,
      rest_seconds: exercise.default_rest_seconds,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not add exercise." };
  }
  revalidatePath("/templates");
  return { ok: true, id: data.id };
}
