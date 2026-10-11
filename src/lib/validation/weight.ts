import { z } from "zod";

export const weighInSchema = z.object({
  weight_kg: z.number().min(20).max(400),
  logged_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  context: z.enum(["fasted", "post_workout", "evening"]).nullable().optional(),
  note: z.string().trim().max(280).nullable().optional(),
});

export const measurementSchema = z.object({
  site: z.enum([
    "waist",
    "chest",
    "hips",
    "neck",
    "left_arm",
    "right_arm",
    "left_thigh",
    "right_thigh",
  ]),
  value_cm: z.number().min(5).max(300),
  logged_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  note: z.string().trim().max(280).nullable().optional(),
});

export const progressionOverrideSchema = z.object({
  exerciseId: z.string().uuid(),
  load: z.number().positive().max(2000).nullable(),
  target_reps_low: z.number().int().min(1).max(50).nullable().optional(),
  target_reps_high: z.number().int().min(1).max(50).nullable().optional(),
  note: z.string().trim().max(280).nullable().optional(),
});
