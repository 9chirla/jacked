import { z } from "zod";

export const exerciseCategory = z.enum([
  "barbell",
  "dumbbell",
  "machine",
  "bodyweight",
  "band",
  "cardio",
  "isometric",
  "cable",
]);

export const exercisePattern = z.enum([
  "push",
  "pull",
  "squat",
  "hinge",
  "carry",
  "core",
  "cardio",
  "other",
]);

export const createExerciseSchema = z.object({
  name: z.string().trim().min(1).max(80),
  category: exerciseCategory,
  primary_pattern: exercisePattern.optional(),
  muscle_groups: z.array(z.string().trim().min(1)).max(12).default([]),
  equipment_required: z.array(z.string().trim().min(1)).max(12).default([]),
  metric: z
    .enum([
      "reps_load",
      "reps_bodyweight",
      "duration",
      "distance",
      "duration_load",
    ])
    .default("reps_load"),
  is_bodyweight: z.boolean().default(false),
  rep_range_low: z.number().int().min(1).max(100).optional(),
  rep_range_high: z.number().int().min(1).max(100).optional(),
  default_rest_seconds: z.number().int().min(0).max(600).default(90),
  notes: z.string().trim().max(500).optional(),
});

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
