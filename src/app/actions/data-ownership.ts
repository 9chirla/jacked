"use server";

import { applyImport } from "@/lib/data/import-apply";
import { validateImportPayload } from "@/lib/data/import-validate";
import { countUserOwnedRows } from "@/lib/data/counts";
import type { ExportTableName } from "@/lib/data/schema-version";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type CountsResult =
  | { ok: true; counts: Record<ExportTableName, number>; total: number }
  | { ok: false; error: string };

export type ImportResult =
  | { ok: true; imported: Record<ExportTableName, number> }
  | { ok: false; error: string };

export type DeleteResult = { ok: true } | { ok: false; error: string };

export async function getOwnedRowCounts(): Promise<CountsResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  try {
    const counts = await countUserOwnedRows(supabase, user.id);
    const total = Object.values(counts).reduce((a, n) => a + n, 0);
    return { ok: true, counts, total };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not count rows.",
    };
  }
}

export async function importJackedJson(raw: unknown): Promise<ImportResult> {
  const validated = validateImportPayload(raw);
  if (!validated.ok) return validated;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const result = await applyImport(supabase, user.id, validated.data);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, imported: result.imported };
}

/**
 * Deletes auth user → profile ON DELETE CASCADE → all owned rows.
 * Requires SUPABASE_SERVICE_ROLE_KEY. Confirmation must be exactly DELETE.
 */
export async function deleteAccountAndData(
  confirmation: string,
): Promise<DeleteResult> {
  if (confirmation !== "DELETE") {
    return { ok: false, error: 'Type DELETE exactly to confirm.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      return { ok: false, error: `Delete failed: ${error.message}` };
    }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "Service role key missing or delete failed.",
    };
  }

  await supabase.auth.signOut();
  return { ok: true };
}
