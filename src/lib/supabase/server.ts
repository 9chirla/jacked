import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/env";
import { createServerClient } from "@supabase/ssr";
import { connection } from "next/server";
import { cookies } from "next/headers";

export async function createClient() {
  // Supabase auth touches unstable time APIs; opt this path out of prerender.
  await connection();
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component; proxy refreshes the session.
        }
      },
    },
  });
}
