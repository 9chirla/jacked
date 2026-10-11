import { ArchiveExerciseButton } from "@/components/library/ArchiveExerciseButton";
import { CreateExerciseForm } from "@/components/library/CreateExerciseForm";
import { ExerciseSearch } from "@/components/library/ExerciseSearch";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { createClient } from "@/lib/supabase/server";
import { ensureLibrarySeeded } from "@/lib/workout/ensure-library";

export const metadata = {
  title: "Exercises",
};

export default async function ExercisesPage() {
  const seed = await ensureLibrarySeeded();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: exercises, error: exerciseError } = await supabase
    .from("exercise")
    .select(
      "id, name, category, primary_pattern, muscle_groups, is_custom, archived_at",
    )
    .eq("user_id", user!.id)
    .is("archived_at", null)
    .order("name");

  const schemaMissing =
    !seed.ok ||
    Boolean(exerciseError?.message?.includes("does not exist")) ||
    Boolean(exerciseError?.code === "42P01");

  return (
    <div className="motion-settle space-y-4">
      <section>
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          Exercises
        </h1>
        <p className="mt-2 text-[16px] text-muted">
          Commercial-gym library seeded for your account. Archive hides an
          exercise from selection without deleting history.
        </p>
      </section>

      <Card>
        <h2 className="font-display mb-3 text-[20px] font-semibold text-ink">
          Add custom
        </h2>
        <CreateExerciseForm />
      </Card>

      {schemaMissing ? (
        <EmptyState
          title="Database migration needed"
          description="Paste and run supabase/migrations/20261011170000_phase3_exercises_templates.sql in the Supabase SQL Editor, then refresh."
        />
      ) : (exercises?.length ?? 0) === 0 ? (
        <EmptyState
          title="No exercises yet"
          description="Seeding should fill a commercial-gym library automatically. Try refreshing."
        />
      ) : (
        <ExerciseSearch
          exercises={exercises ?? []}
          renderActions={(exercise) => (
            <ArchiveExerciseButton exerciseId={exercise.id} />
          )}
        />
      )}
    </div>
  );
}
