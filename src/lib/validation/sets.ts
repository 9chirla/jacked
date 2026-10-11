import { z } from "zod";

export const setKindSchema = z.enum([
  "warmup",
  "working",
  "drop",
  "failure",
  "isometric",
  "amrap",
]);

export const upsertSetSchema = z.object({
  id: z.string().uuid().optional(),
  session_exercise_id: z.string().uuid(),
  set_number: z.number().int().min(1).max(50),
  kind: setKindSchema.default("working"),
  load: z.number().positive().max(2000).nullable().optional(),
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  note: z.string().trim().max(280).nullable().optional(),
  completed: z.boolean().default(false),
  source: z.enum(["manual", "prefill", "import", "demo"]).default("manual"),
});

export const finishSessionSchema = z.object({
  sessionId: z.string().uuid(),
  session_rpe: z.number().min(1).max(10).nullable().optional(),
  fatigue_before: z.number().int().min(1).max(5).nullable().optional(),
  soreness_after: z.number().int().min(1).max(5).nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
  /** When set, refuse silent overwrite of a completed session that moved. */
  expectedUpdatedAt: z.string().min(1).optional(),
});
