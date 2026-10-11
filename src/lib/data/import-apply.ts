import type { SupabaseClient } from "@supabase/supabase-js";
import type { ValidatedImport } from "@/lib/data/import-validate";
import type { ExportTableName } from "@/lib/data/schema-version";

export type ImportApplyResult =
  | { ok: true; imported: Record<ExportTableName, number> }
  | { ok: false; error: string; imported: Partial<Record<ExportTableName, number>> };

function withUserId(
  rows: Record<string, unknown>[],
  userId: string,
): Record<string, unknown>[] {
  return rows.map((row) => ({ ...row, user_id: userId }));
}

async function upsertBatch(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
): Promise<string | null> {
  if (rows.length === 0) return null;
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const { error } = await supabase.from(table).upsert(slice, { onConflict: "id" });
    if (error) return `${table}: ${error.message}`;
  }
  return null;
}

/**
 * Apply a validated export into the current user's account.
 * Forces user_id / profile id to the signed-in user. Skips export_log.
 */
export async function applyImport(
  supabase: SupabaseClient,
  userId: string,
  data: ValidatedImport,
): Promise<ImportApplyResult> {
  const imported: Partial<Record<ExportTableName, number>> = {};

  const profileRows = data.tables.profile;
  if (profileRows.length > 0) {
    // Profile is trigger-created: authenticated has UPDATE only (no INSERT).
    const { id: _id, created_at: _createdAt, ...fields } = profileRows[0]!;
    void _id;
    void _createdAt;
    const { error } = await supabase
      .from("profile")
      .update(fields)
      .eq("id", userId);
    if (error) {
      return { ok: false, error: `profile: ${error.message}`, imported };
    }
    imported.profile = 1;
  }

  const order: ExportTableName[] = [
    "equipment",
    "goal",
    "exercise",
    "workout_template",
    "template_item",
    "workout_session",
    "session_exercise",
    "exercise_set",
    "body_weight_entry",
    "body_measurement",
    "progression_override",
    "daily_check_in",
    "week_plan",
    "progress_photo",
  ];

  for (const name of order) {
    let rows = data.tables[name];
    if (name === "template_item" || name === "session_exercise") {
      // no user_id column
    } else {
      rows = withUserId(rows, userId);
    }

    if (name === "workout_session") {
      rows = rows.map((r) => ({ ...r, user_id: userId }));
    }
    if (name === "exercise_set") {
      rows = rows.map((r) => ({ ...r, user_id: userId, source: "import" }));
    }

    const err = await upsertBatch(supabase, name, rows);
    if (err) {
      return { ok: false, error: err, imported };
    }
    imported[name] = rows.length;
  }

  imported.export_log = 0;

  return {
    ok: true,
    imported: imported as Record<ExportTableName, number>,
  };
}
