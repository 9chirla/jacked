/** 0 = Sunday … 6 = Saturday (JS Date#getDay). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type PlannedDayStatus = "planned" | "done" | "missed" | "skipped";

export type PlannedDay = {
  date: string; // YYYY-MM-DD local
  templateId: string;
  status: PlannedDayStatus;
  sessionId?: string | null;
};

export type WeekPlanStatus = "active" | "completed" | "skipped";

export type WeekPlanRecord = {
  id: string;
  userId: string;
  weekStart: string;
  timezone: string;
  availableDays: Weekday[];
  plannedDays: PlannedDay[];
  status: WeekPlanStatus;
  clientUpdatedAt: string;
  updatedAt?: string;
};

export type TemplateRef = {
  id: string;
  name: string;
  sortOrder: number;
  dayLabel?: string | null;
};
