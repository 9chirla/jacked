import { z } from "zod";

export const goalEnum = z.enum([
  "muscle",
  "fat_loss",
  "strength",
  "endurance",
  "general",
  "mobility",
]);

export const onboardingSchema = z.object({
  display_name: z.string().trim().min(1).max(80).optional(),
  primary_goal: goalEnum,
  goals: z.array(goalEnum).min(1).max(6),
  experience_level: z.enum(["beginner", "intermediate", "advanced"]),
  equipment_kind: z.enum([
    "commercial_gym",
    "home_full",
    "dumbbells",
    "bodyweight",
    "other",
  ]),
  training_location: z.string().trim().max(120).optional(),
  current_routine: z.string().trim().max(500).optional(),
  limitations: z.string().trim().max(1000).optional().or(z.literal("")),
  sessions_per_week: z.number().int().min(1).max(7),
  session_minutes: z.number().int().min(15).max(180),
  preferred_days: z.array(z.string()).max(7).optional(),
  mass_unit: z.enum(["kg", "lb"]),
  length_unit: z.enum(["cm", "in"]),
  height_cm: z.number().min(100).max(250).optional(),
  current_weight_kg: z.number().min(20).max(400),
  target_weight_kg: z.number().min(20).max(400),
  weight_change_rate_kg_per_week: z.number().min(0.1).max(1.5),
  logging_detail: z.enum(["minimal", "standard", "detailed"]),
  coaching_tone: z.enum(["analytical", "supportive", "direct"]),
  theme: z.enum(["system", "light", "dark"]),
  progression_model: z.enum(["double_progression"]),
  rest_timer_enabled: z.boolean(),
  checkin_enabled: z.boolean(),
  cardio_separate: z.boolean(),
  prefill_last: z.boolean(),
  timeframe_months: z.number().int().min(1).max(24),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileSettingsSchema = z.object({
  display_name: z.string().trim().min(1).max(80).optional(),
  mass_unit: z.enum(["kg", "lb"]).optional(),
  length_unit: z.enum(["cm", "in"]).optional(),
  coaching_tone: z.enum(["analytical", "supportive", "direct"]).optional(),
  logging_detail: z.enum(["minimal", "standard", "detailed"]).optional(),
  progression_model: z.enum(["double_progression"]).optional(),
  theme: z.enum(["system", "light", "dark"]).optional(),
  sessions_per_week: z.number().int().min(1).max(7).optional(),
  session_minutes: z.number().int().min(15).max(180).optional(),
  limitations: z.string().trim().max(1000).optional(),
  primary_goal: goalEnum.optional(),
  experience_level: z
    .enum(["beginner", "intermediate", "advanced"])
    .optional(),
});
