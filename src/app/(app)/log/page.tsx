import { EmptyState } from "@/components/ui/EmptyState";
import { requireAuthedUserId } from "@/lib/supabase/auth";
import { ensureLibrarySeeded } from "@/lib/workout/ensure-library";

export const metadata = {
  title: "Log",
};

export default async function LogPage() {
  await ensureLibrarySeeded();
  const auth = await requireAuthedUserId();
  if (!auth) return null;

  const { data: active } = await auth.supabase
    .from("workout_session")
    .select("id, status, started_at, workout_template(name)")
    .eq("user_id", auth.userId)
    .in("status", ["in_progress", "paused"])
    .order("started_at", { ascending: false })
    .limit(5);

  return (
    <div className="motion-settle space-y-4">
      <section>
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          Log
        </h1>
        <p className="mt-2 text-[16px] text-muted">
          Start a template from Today or Templates. Set keypad logging ships in
          Phase 4.
        </p>
      </section>

      {(active?.length ?? 0) === 0 ? (
        <EmptyState
          title="No active workout"
          description="Pick Full Body A or B and tap Start to open an in-progress session."
          action={
            <a
              href="/templates"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-accent px-4 font-medium text-accent-ink"
            >
              Choose template
            </a>
          }
        />
      ) : (
        <ul className="space-y-2">
          {active!.map((session) => {
            const template = Array.isArray(session.workout_template)
              ? session.workout_template[0]
              : session.workout_template;
            return (
              <li key={session.id}>
                <a
                  href={`/log/${session.id}`}
                  className="flex min-h-14 items-center justify-between rounded-[var(--radius-lg)] border border-line bg-surface px-4"
                >
                  <span className="text-[16px] text-ink">
                    {template?.name ?? "Workout"}
                  </span>
                  <span className="text-[14px] text-muted">{session.status}</span>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
