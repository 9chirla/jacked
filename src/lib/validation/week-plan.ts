import { z } from "zod";

export const plannedDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  templateId: z.string().uuid(),
  status: z.enum(["planned", "done", "missed", "skipped"]),
  sessionId: z.string().uuid().nullable().optional(),
});

export const upsertWeekPlanSchema = z.object({
  id: z.string().uuid().optional(),
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone: z.string().min(1).max(64),
  available_days: z.array(z.number().int().min(0).max(6)).max(7),
  planned_days: z.array(plannedDaySchema).max(14),
  status: z.enum(["active", "completed", "skipped"]).default("active"),
  client_updated_at: z.string().min(1).optional(),
});

export type UpsertWeekPlanInput = z.infer<typeof upsertWeekPlanSchema>;
