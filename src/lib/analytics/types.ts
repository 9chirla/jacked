export type RangeKey = "4w" | "3m" | "6m" | "1y" | "all";

export type ExerciseHistoryPoint = {
  sessionId: string;
  date: string;
  topLoad: number;
  topReps: number;
  volume: number;
  e1rm: number | null;
};

export type MeasuredPrRow = {
  setId: string;
  exerciseId: string;
  exerciseName: string;
  load: number;
  reps: number;
  completedAt: string | null;
  sessionId: string | null;
};

export type EstimatedPrRow = {
  exerciseId: string;
  exerciseName: string;
  e1rm: number;
  load: number;
  reps: number;
  setId: string;
  completedAt: string | null;
};
