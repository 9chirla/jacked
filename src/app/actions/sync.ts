"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { ok: true; id?: string; data?: unknown }
  | { ok: false; error: string };

export async function logSyncConflict(input: {
  entity: string;
  clientPayload: unknown;
  serverPayload: unknown;
  outboxId?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data, error } = await supabase
    .from("sync_conflict")
    .insert({
      user_id: user.id,
      entity: input.entity,
      client_payload: input.clientPayload ?? {},
      server_payload: input.serverPayload ?? {},
      outbox_id: input.outboxId ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

export async function listOpenSyncConflicts(): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data, error } = await supabase
    .from("sync_conflict")
    .select(
      "id, entity, client_payload, server_payload, outbox_id, created_at, resolution",
    )
    .eq("user_id", user.id)
    .is("resolution", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: data ?? [] };
}

export async function resolveSyncConflict(input: {
  id: string;
  resolution: "keep_local" | "keep_server" | "merge" | "dismissed";
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { error } = await supabase
    .from("sync_conflict")
    .update({
      resolution: input.resolution,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
