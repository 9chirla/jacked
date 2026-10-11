/** Bump only with a documented migration + import path. */
export const EXPORT_SCHEMA_VERSION = "jacked.export.v1";

export const APP_VERSION = "0.11.0";

/** Tables included in a full ownership export (dependency-friendly order). */
export const EXPORT_TABLES = [
  "profile",
  "equipment",
  "goal",
  "exercise",
  "workout_template",
  "template_item",
  "workout_session",
  "session_exercise",
  "exercise_set",
  "body_weight_entry",
  "body_measurement",
  "progression_override",
  "daily_check_in",
  "week_plan",
  "progress_photo",
  "export_log",
] as const;

export type ExportTableName = (typeof EXPORT_TABLES)[number];
