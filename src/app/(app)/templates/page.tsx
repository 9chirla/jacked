import {
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  startTemplateSession,
} from "@/app/actions/library";
import { CreateTemplateForm } from "@/components/library/CreateTemplateForm";
import { TemplateActions } from "@/components/library/TemplateActions";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { ensureLibrarySeeded } from "@/lib/workout/ensure-library";

export const metadata = {
  title: "Templates",
};

export default async function TemplatesPage() {
  await ensureLibrarySeeded();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: templates } = await supabase
    .from("workout_template")
    .select("id, name, day_label, is_active, sort_order")
    .eq("user_id", user!.id)
    .eq("is_active", true)
    .order("sort_order");

  const templateIds = (templates ?? []).map((t) => t.id);
  const { data: items } = templateIds.length
    ? await supabase
        .from("template_item")
        .select(
          "template_id, sort_order, target_sets, target_reps_low, target_reps_high, exercise:exercise_id(name)",
        )
        .in("template_id", templateIds)
        .order("sort_order")
    : { data: [] as never[] };

  const itemsByTemplate = new Map<string, typeof items>();
  for (const item of items ?? []) {
    const list = itemsByTemplate.get(item.template_id) ?? [];
    list.push(item);
    itemsByTemplate.set(item.template_id, list);
  }

  return (
    <div className="motion-settle space-y-4">
      <section>
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          Templates
        </h1>
        <p className="mt-2 text-[16px] text-muted">
          Full Body A/B rotate across your 3 weekly sessions. Create, start,
          duplicate, or delete — start opens an in-progress session.
        </p>
        <a
          href="/exercises"
          className="mt-2 inline-flex min-h-12 items-center text-[14px] text-muted underline-offset-4 hover:underline"
        >
          Manage exercise library
        </a>
      </section>

      <Card>
        <CreateTemplateForm createAction={createTemplate} />
      </Card>

      {(templates?.length ?? 0) === 0 ? (
        <EmptyState
          title="No templates"
          description="Seed Full Body A/B from the library seed, or create a blank template above."
        />
      ) : (
        <ul className="space-y-3">
          {templates!.map((template) => {
            const list = itemsByTemplate.get(template.id) ?? [];
            return (
              <li key={template.id}>
                <Card className="space-y-3">
                  <div>
                    <h2 className="font-display text-[20px] font-semibold text-ink">
                      {template.name}
                    </h2>
                    <p className="text-[14px] text-muted">
                      {template.day_label ?? "Custom"} · {list.length} exercises
                    </p>
                  </div>
                  <ol className="space-y-1 text-[14px] text-ink">
                    {list.map((item, index) => {
                      const exercise = Array.isArray(item.exercise)
                        ? item.exercise[0]
                        : item.exercise;
                      return (
                        <li key={`${template.id}-${index}`} className="flex gap-2">
                          <span className="tabular text-muted">{index + 1}.</span>
                          <span>
                            {exercise?.name ?? "Exercise"}
                            {item.target_sets
                              ? ` · ${item.target_sets}×${item.target_reps_low ?? "?"}-${item.target_reps_high ?? "?"}`
                              : ""}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  <TemplateActions
                    templateId={template.id}
                    startAction={startTemplateSession}
                    duplicateAction={duplicateTemplate}
                    deleteAction={deleteTemplate}
                  />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
