"use client";

import { createCustomExercise } from "@/app/actions/library";
import { useSyncStatus } from "@/components/pwa/SyncProvider";
import { Button } from "@/components/ui/Button";
import { queueAndSync } from "@/lib/offline/mutate";
import { useState } from "react";

export function CreateExerciseForm() {
  const { online, refreshPending } = useSyncStatus();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("dumbbell");
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNote(null);
    const payload = {
      name,
      category,
      primary_pattern: "other",
      muscle_groups: [],
      equipment_required: [category],
      metric: "reps_load",
      is_bodyweight: category === "bodyweight",
      default_rest_seconds: 90,
    };
    const result = await queueAndSync({
      entity: "exercise",
      op: "create",
      payload,
      clientKey: `ex:${name.trim().toLowerCase()}`,
      execute: () => createCustomExercise(payload),
    });
    await refreshPending();
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setName("");
    if (result.queued && !online) {
      setNote("Queued on device — will sync when online.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block space-y-1">
        <span className="text-[14px] text-muted">Custom exercise name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px]"
          placeholder="e.g. Landmine Press"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-[14px] text-muted">Category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px]"
        >
          {[
            "barbell",
            "dumbbell",
            "machine",
            "cable",
            "bodyweight",
            "band",
            "cardio",
            "isometric",
          ].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="text-[14px] text-muted" role="status">
          {note}
        </p>
      ) : null}
      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Saving…" : "Add custom exercise"}
      </Button>
    </form>
  );
}
