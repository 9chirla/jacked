import { getServiceRoleKey, getSupabaseUrl } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";

/** Server-only admin client. Never import from client components. */
export function createAdminClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
