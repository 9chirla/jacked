import { z } from "zod";

export const upsertCheckInSchema = z.object({
  logged_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  fatigue: z.number().int().min(1).max(5),
  soreness: z.number().int().min(1).max(5),
  sleep: z.number().int().min(1).max(5).nullable().optional(),
  discomfort_text: z.string().max(500).nullable().optional(),
});

export type UpsertCheckInInput = z.infer<typeof upsertCheckInSchema>;
