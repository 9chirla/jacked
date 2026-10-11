import type { SupabaseClient } from "@supabase/supabase-js";
import {
  EXPORT_TABLES,
  type ExportTableName,
} from "@/lib/data/schema-version";

async function countOwned(
  supabase: SupabaseClient,
  table: ExportTableName,
  userId: string,
): Promise<number> {
  if (table === "profile") {
    const { count, error } = await supabase
      .from("profile")
      .select("id", { count: "exact", head: true })
      .eq("id", userId);
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
  }

  if (table === "template_item") {
    const { data, error } = await supabase
      .from("workout_template")
      .select("id")
      .eq("user_id", userId);
    if (error) throw new Error(`workout_template: ${error.message}`);
    const ids = (data ?? []).map((t) => t.id as string);
    if (ids.length === 0) return 0;
    const { count, error: cErr } = await supabase
      .from("template_item")
      .select("id", { count: "exact", head: true })
      .in("template_id", ids);
    if (cErr) throw new Error(`${table}: ${cErr.message}`);
    return count ?? 0;
  }

  if (table === "session_exercise") {
    const { data, error } = await supabase
      .from("workout_session")
      .select("id")
      .eq("user_id", userId);
    if (error) throw new Error(`workout_session: ${error.message}`);
    const ids = (data ?? []).map((s) => s.id as string);
    if (ids.length === 0) return 0;
    const { count, error: cErr } = await supabase
      .from("session_exercise")
      .select("id", { count: "exact", head: true })
      .in("session_id", ids);
    if (cErr) throw new Error(`${table}: ${cErr.message}`);
    return count ?? 0;
  }

  if (table === "exercise_set") {
    const { count, error } = await supabase
      .from("exercise_set")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
  }

  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`${table}: ${error.message}`);
  return count ?? 0;
}

export async function countUserOwnedRows(
  supabase: SupabaseClient,
  userId: string,
): Promise<Record<ExportTableName, number>> {
  const counts = {} as Record<ExportTableName, number>;
  for (const name of EXPORT_TABLES) {
    counts[name] = await countOwned(supabase, name, userId);
  }
  return counts;
}
