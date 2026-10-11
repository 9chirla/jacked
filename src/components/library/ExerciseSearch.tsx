"use client";

import { useMemo, useState } from "react";

type Exercise = {
  id: string;
  name: string;
  category: string;
  primary_pattern: string | null;
  muscle_groups: string[] | null;
  is_custom: boolean;
};

export function ExerciseSearch({
  exercises,
  renderActions,
}: {
  exercises: Exercise[];
  renderActions?: (exercise: Exercise) => React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises.filter((exercise) => {
      if (category !== "all" && exercise.category !== category) return false;
      if (!q) return true;
      return (
        exercise.name.toLowerCase().includes(q) ||
        (exercise.primary_pattern ?? "").includes(q) ||
        (exercise.muscle_groups ?? []).some((g) => g.toLowerCase().includes(q))
      );
    });
  }, [category, exercises, query]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(exercises.map((e) => e.category))).sort()],
    [exercises],
  );

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search name, pattern, muscle…"
        className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px]"
      />
      <div className="flex flex-wrap gap-2">
        {categories.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            className={`min-h-12 rounded-[var(--radius-sm)] border px-3 text-[14px] ${
              category === value
                ? "border-accent-ink/20 bg-accent text-accent-ink"
                : "border-line bg-surface text-muted"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {filtered.map((exercise) => (
          <li
            key={exercise.id}
            className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-line bg-surface px-3 py-3"
          >
            <div>
              <p className="text-[16px] font-medium text-ink">{exercise.name}</p>
              <p className="text-[14px] text-muted">
                {exercise.category}
                {exercise.primary_pattern ? ` · ${exercise.primary_pattern}` : ""}
                {exercise.is_custom ? " · custom" : ""}
              </p>
            </div>
            {renderActions?.(exercise)}
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p className="text-[14px] text-muted">No exercises match.</p>
      ) : null}
    </div>
  );
}
