import { createClient } from "@/lib/supabase/server";

type Claims = NonNullable<
  Awaited<ReturnType<Awaited<ReturnType<typeof createClient>>["auth"]["getClaims"]>>["data"]
>["claims"];

/**
 * Resolve the signed-in user id from the JWT (local verify via getClaims).
 * Prefer this on read paths — middleware already refreshed the session.
 * Use auth.getUser() on mutations that need an Auth-server check.
 */
export async function getAuthedUserId(): Promise<string | null> {
  const auth = await requireAuthedUserId();
  return auth?.userId ?? null;
}

export async function requireAuthedUserId(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  claims: Claims;
} | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (typeof sub !== "string" || !sub) return null;
  return { supabase, userId: sub, claims: data?.claims ?? null };
}
