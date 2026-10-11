import type { SupabaseClient } from "@supabase/supabase-js";
import {
  APP_VERSION,
  EXPORT_SCHEMA_VERSION,
  EXPORT_TABLES,
  type ExportTableName,
} from "@/lib/data/schema-version";

export type ExportBundle = {
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  exportedAt: string;
  appVersion: string;
  userId: string;
  counts: Record<ExportTableName, number>;
  tables: Record<ExportTableName, Record<string, unknown>[]>;
};

async function fetchTable(
  supabase: SupabaseClient,
  table: ExportTableName,
  userId: string,
): Promise<Record<string, unknown>[]> {
  if (table === "profile") {
    const { data, error } = await supabase
      .from("profile")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`${table}: ${error.message}`);
    return data ? [data as Record<string, unknown>] : [];
  }

  if (table === "template_item") {
    const { data: templates, error: tErr } = await supabase
      .from("workout_template")
      .select("id")
      .eq("user_id", userId);
    if (tErr) throw new Error(`workout_template: ${tErr.message}`);
    const ids = (templates ?? []).map((t) => t.id as string);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("template_item")
      .select("*")
      .in("template_id", ids)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as Record<string, unknown>[];
  }

  if (table === "session_exercise") {
    const { data: sessions, error: sErr } = await supabase
      .from("workout_session")
      .select("id")
      .eq("user_id", userId);
    if (sErr) throw new Error(`workout_session: ${sErr.message}`);
    const ids = (sessions ?? []).map((s) => s.id as string);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("session_exercise")
      .select("*")
      .in("session_id", ids)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as Record<string, unknown>[];
  }

  if (table === "exercise_set") {
    const { data: sessions, error: sErr } = await supabase
      .from("workout_session")
      .select("id")
      .eq("user_id", userId);
    if (sErr) throw new Error(`workout_session: ${sErr.message}`);
    const sessionIds = (sessions ?? []).map((s) => s.id as string);
    if (sessionIds.length === 0) return [];
    const { data: ses, error: seErr } = await supabase
      .from("session_exercise")
      .select("id")
      .in("session_id", sessionIds);
    if (seErr) throw new Error(`session_exercise: ${seErr.message}`);
    const seIds = (ses ?? []).map((s) => s.id as string);
    if (seIds.length === 0) return [];
    const { data, error } = await supabase
      .from("exercise_set")
      .select("*")
      .in("session_exercise_id", seIds)
      .order("set_number", { ascending: true });
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as Record<string, unknown>[];
  }

  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as Record<string, unknown>[];
}

export async function collectUserExport(
  supabase: SupabaseClient,
  userId: string,
): Promise<ExportBundle> {
  const tables = {} as Record<ExportTableName, Record<string, unknown>[]>;
  const counts = {} as Record<ExportTableName, number>;

  for (const name of EXPORT_TABLES) {
    const rows = await fetchTable(supabase, name, userId);
    tables[name] = rows;
    counts[name] = rows.length;
  }

  return {
    schemaVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    userId,
    counts,
    tables,
  };
}

export function totalRowCount(bundle: ExportBundle): number {
  return Object.values(bundle.counts).reduce((a, n) => a + n, 0);
}
