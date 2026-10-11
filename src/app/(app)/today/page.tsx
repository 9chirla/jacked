import {
  deleteTemplate,
  duplicateTemplate,
  startTemplateSession,
} from "@/app/actions/library";
import { TemplateActions } from "@/components/library/TemplateActions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import { createClient } from "@/lib/supabase/server";
import { ensureLibrarySeeded } from "@/lib/workout/ensure-library";

export const metadata = {
  title: "Today",
};

export default async function TodayPage() {
  await ensureLibrarySeeded();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profile")
    .select("sessions_per_week, session_minutes")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: active } = await supabase
    .from("workout_session")
    .select("id, status, started_at, workout_template(name)")
    .eq("user_id", user!.id)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: templates } = await supabase
    .from("workout_template")
    .select("id, name, day_label")
    .eq("user_id", user!.id)
    .eq("is_active", true)
    .order("sort_order")
    .limit(2);

  const activeTemplate = Array.isArray(active?.workout_template)
    ? active?.workout_template[0]
    : active?.workout_template;

  return (
    <div className="motion-settle space-y-4">
      <section>
        <p className="text-[14px] text-muted">Full Body ×3 (A/B/A)</p>
        <h1 className="font-display mt-1 text-[34px] font-semibold tracking-tight text-ink">
          {active
            ? "Session in progress"
            : templates?.[0]
              ? `Up next: ${templates[0].name}`
              : "Nothing planned yet"}
        </h1>
        <p className="mt-2 max-w-prose text-[16px] text-muted">
          Target {profile?.sessions_per_week ?? 3} sessions · ~
          {profile?.session_minutes ?? 60} min. Start a template to log sets
          with the keypad and rest timer.
        </p>
      </section>

      {active ? (
        <Card className="space-y-3">
          <p className="text-[16px] text-ink">
            {activeTemplate?.name ?? "Workout"} · started{" "}
            {active.started_at
              ? active.started_at.replace("T", " ").slice(0, 16)
              : "—"}
          </p>
          <a
            href={`/log/${active.id}`}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-accent px-4 font-medium text-accent-ink"
          >
            Resume session
          </a>
        </Card>
      ) : null}

      {(templates?.length ?? 0) === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Apply the Phase 3 migration to seed Full Body A/B, or create one under Templates."
          action={
            <a
              href="/templates"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-accent px-4 font-medium text-accent-ink"
            >
              Open Templates
            </a>
          }
        />
      ) : (
        <ul className="space-y-3">
          {templates!.map((template) => (
            <li key={template.id}>
              <Card className="space-y-3">
                <div>
                  <h2 className="font-display text-[20px] font-semibold text-ink">
                    {template.name}
                  </h2>
                  <p className="text-[14px] text-muted">
                    Day {template.day_label ?? "—"}
                  </p>
                </div>
                <TemplateActions
                  templateId={template.id}
                  startAction={startTemplateSession}
                  duplicateAction={duplicateTemplate}
                  deleteAction={deleteTemplate}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="This week"
          value="—"
          hint={`0 of ${profile?.sessions_per_week ?? 3} sessions`}
        />
        <StatTile
          label="Library"
          value="Gym"
          hint="Commercial equipment seed"
        />
      </div>

      <div className="flex flex-wrap gap-3 text-[14px]">
        <a
          href="/templates"
          className="inline-flex min-h-12 items-center text-muted underline-offset-4 hover:underline"
        >
          All templates
        </a>
        <a
          href="/exercises"
          className="inline-flex min-h-12 items-center text-muted underline-offset-4 hover:underline"
        >
          Exercise library
        </a>
      </div>
    </div>
  );
}
