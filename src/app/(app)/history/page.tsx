import { HistoryOfflineNote } from "@/components/history/HistoryOfflineNote";
import { AppLink } from "@/components/nav/AppLink";
import { EmptyState } from "@/components/ui/EmptyState";
import { listCompletedSessions } from "@/lib/analytics/queries";
import { kgToLb, roundMassDisplay } from "@/lib/calculations/units";
import { requireAuthedUserId } from "@/lib/supabase/auth";

export const metadata = {
  title: "History",
};

function monthKey(iso: string | null): string {
  if (!iso) return "Unknown";
  return iso.slice(0, 7);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function formatMonth(key: string): string {
  if (key === "Unknown" || key.length < 7) return key;
  const year = key.slice(0, 4);
  const month = Number(key.slice(5, 7));
  const name = MONTHS[month - 1];
  return name ? `${name} ${year}` : key;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null || seconds <= 0) return "—";
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export default async function HistoryPage() {
  const auth = await requireAuthedUserId();
  if (!auth) return null;
  const [{ data: profile }, sessions] = await Promise.all([
    auth.supabase
      .from("profile")
      .select("mass_unit")
      .eq("id", auth.userId)
      .maybeSingle(),
    listCompletedSessions(120),
  ]);
  const massUnit = (profile?.mass_unit as "kg" | "lb") ?? "kg";

  const groups = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = monthKey(s.completedAt ?? s.startedAt);
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  return (
    <div className="motion-settle space-y-4">
      <section>
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          History
        </h1>
        <p className="mt-2 text-[16px] text-muted">
          Completed sessions grouped by month. Volume is working-set load ×
          reps only.
        </p>
        <div className="mt-2">
          <HistoryOfflineNote />
        </div>
      </section>

      {sessions.length === 0 ? (
        <EmptyState
          title="No sessions recorded"
          description="Finish a workout and it will appear here, recoverable after refresh and app relaunch."
        />
      ) : (
        [...groups.entries()].map(([key, rows]) => (
          <section key={key} className="space-y-2">
            <h2 className="font-display text-[20px] font-semibold text-ink">
              {formatMonth(key)}
            </h2>
            <ul className="divide-y divide-line rounded-[var(--radius)] border border-line bg-surface">
              {rows.map((s) => {
                const date = (s.completedAt ?? s.startedAt ?? "").slice(0, 10);
                const vol =
                  s.totalVolume == null
                    ? "—"
                    : massUnit === "lb"
                      ? `${roundMassDisplay(kgToLb(s.totalVolume))} lb·reps`
                      : `${Math.round(s.totalVolume)} kg·reps`;
                return (
                  <li key={s.id}>
                    <AppLink
                      href={`/log/${s.id}/review`}
                      className="flex min-h-11 items-center justify-between gap-3 px-3 py-3"
                    >
                      <div>
                        <p className="text-[16px] text-ink">{s.title}</p>
                        <p className="text-[14px] text-muted">
                          {date} · {formatDuration(s.durationSeconds)}
                          {s.sessionRpe != null ? ` · RPE ${s.sessionRpe}` : ""}
                        </p>
                      </div>
                      <div className="text-right text-[14px]">
                        <p className="tabular text-ink">{vol}</p>
                        <p className="text-muted">
                          {s.totalWorkingSets ?? 0} sets
                          {s.totalReps != null ? ` · ${s.totalReps} reps` : ""}
                        </p>
                      </div>
                    </AppLink>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
