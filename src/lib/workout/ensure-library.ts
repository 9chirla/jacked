import { requireAuthedUserId } from "@/lib/supabase/auth";

/** Idempotent commercial-gym seed for the signed-in user. Safe to call from RSC. */
export async function ensureLibrarySeeded() {
  const auth = await requireAuthedUserId();
  if (!auth) return { ok: false as const, error: "Sign in required." };

  const { count } = await auth.supabase
    .from("exercise")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.userId);

  if ((count ?? 0) > 0) return { ok: true as const };

  const { error } = await auth.supabase.rpc("seed_commercial_gym_library", {
    p_user_id: auth.userId,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}
