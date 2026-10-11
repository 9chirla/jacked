"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; id?: string; data?: unknown }
  | { ok: false; error: string };

export async function listProgressPhotos(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data, error } = await supabase
    .from("progress_photo")
    .select("id, taken_date, storage_path, note, created_at")
    .eq("user_id", user.id)
    .order("taken_date", { ascending: false })
    .limit(40);

  if (error) return { ok: false, error: error.message };

  const withUrls = await Promise.all(
    (data ?? []).map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("progress-photos")
        .createSignedUrl(row.storage_path as string, 3600);
      return {
        ...row,
        signedUrl: signed?.signedUrl ?? null,
      };
    }),
  );

  return { ok: true, data: withUrls };
}

export async function registerProgressPhoto(input: {
  storagePath: string;
  takenDate: string;
  note?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  if (!input.storagePath.startsWith(`${user.id}/`)) {
    return { ok: false, error: "Invalid storage path." };
  }

  const { data, error } = await supabase
    .from("progress_photo")
    .insert({
      user_id: user.id,
      storage_path: input.storagePath,
      taken_date: input.takenDate,
      note: input.note ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/progress");
  return { ok: true, id: data?.id };
}

export async function deleteProgressPhoto(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data: row, error: findErr } = await supabase
    .from("progress_photo")
    .select("id, storage_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (findErr || !row) {
    return { ok: false, error: findErr?.message ?? "Photo not found." };
  }

  await supabase.storage
    .from("progress-photos")
    .remove([row.storage_path as string]);

  const { error } = await supabase
    .from("progress_photo")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/progress");
  return { ok: true };
}
