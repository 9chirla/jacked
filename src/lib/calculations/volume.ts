export type SetLike = {
  kind: string;
  load: number | null;
  reps: number | null;
  completed?: boolean;
};

/** Working-set volume only. Warm-ups and null load contribute 0. */
export function workingVolume(sets: SetLike[]): number {
  return sets.reduce((sum, set) => {
    if (set.kind !== "working") return sum;
    if (set.load == null || set.reps == null) return sum;
    return sum + set.load * set.reps;
  }, 0);
}

export function workingReps(sets: SetLike[]): number {
  return sets.reduce((sum, set) => {
    if (set.kind !== "working" || set.reps == null) return sum;
    return sum + set.reps;
  }, 0);
}

export function workingSetCount(sets: SetLike[]): number {
  return sets.filter((set) => set.kind === "working" && set.completed).length;
}

/** After deleting a set, remaining sets renumber 1..n in original order. */
export function renumberSets<T extends { set_number: number }>(
  sets: T[],
): T[] {
  return [...sets]
    .sort((a, b) => a.set_number - b.set_number)
    .map((set, index) => ({ ...set, set_number: index + 1 }));
}

export function epleyE1rm(load: number, reps: number, ceiling = 10): number | null {
  if (load <= 0 || reps <= 0 || reps > ceiling) return null;
  return load * (1 + reps / 30);
}

/**
 * Bodyweight exercise volume (§10.10): (bodyWeight + addedLoad) × reps.
 * Returns estimate flag; incomplete when body weight is missing.
 */
export function bodyweightSetVolume(input: {
  bodyWeightKg: number | null;
  addedLoadKg: number | null;
  reps: number | null;
}): { volume: number; estimate: boolean; incomplete: boolean } {
  if (input.reps == null) {
    return { volume: 0, estimate: false, incomplete: false };
  }
  if (input.bodyWeightKg == null) {
    return { volume: 0, estimate: false, incomplete: true };
  }
  const added = input.addedLoadKg ?? 0;
  return {
    volume: (input.bodyWeightKg + added) * input.reps,
    estimate: true,
    incomplete: false,
  };
}
