import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabasePublishableKey());
}
