"use server";

import { upsertCheckInSchema } from "@/lib/validation/checkin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export async function upsertDailyCheckIn(
  input: unknown,
): Promise<ActionResult> {
  const parsed = upsertCheckInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid check-in",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { data, error } = await supabase
    .from("daily_check_in")
    .upsert(
      {
        user_id: user.id,
        logged_date: parsed.data.logged_date,
        fatigue: parsed.data.fatigue,
        soreness: parsed.data.soreness,
        sleep: parsed.data.sleep ?? null,
        discomfort_text: parsed.data.discomfort_text?.trim() || null,
      },
      { onConflict: "user_id,logged_date" },
    )
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      error: error?.message ?? "Could not save check-in.",
    };
  }

  // Avoid broad revalidate after check-in — Flight soft-refresh on Next 16.3
  // was crashing the error overlay (`.stack` / enqueueModel). Form shows local
  // success; next full navigation to /coach picks up the row.
  revalidatePath("/coach");
  return { ok: true, id: data.id as string };
}
