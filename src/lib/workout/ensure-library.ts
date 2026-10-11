import { createClient } from "@/lib/supabase/server";

/** Idempotent commercial-gym seed for the signed-in user. Safe to call from RSC. */
export async function ensureLibrarySeeded() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in required." };

  const { count } = await supabase
    .from("exercise")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  if ((count ?? 0) > 0) return { ok: true as const };

  const { error } = await supabase.rpc("seed_commercial_gym_library", {
    p_user_id: user.id,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}
