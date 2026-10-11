export function buildAnalyticsSummary(input: {
  sessionsThisWeek: number;
  sessionsTarget: number;
  streakWeeks: number;
  volumeDelta: number | null;
  measuredPrCount: number;
  weightTrend: "up" | "down" | "flat" | null;
}): string {
  const parts: string[] = [];

  parts.push(
    `${input.sessionsThisWeek} of ${input.sessionsTarget} planned sessions this week`,
  );

  if (input.streakWeeks > 0) {
    parts.push(
      `current streak ${input.streakWeeks} week${input.streakWeeks === 1 ? "" : "s"} with at least one session`,
    );
  }

  if (input.volumeDelta != null) {
    const sign = input.volumeDelta >= 0 ? "+" : "";
    parts.push(
      `volume ${sign}${Math.round(input.volumeDelta)} vs the prior 4 weeks`,
    );
  }

  if (input.measuredPrCount > 0) {
    parts.push(
      `${input.measuredPrCount} measured PR${input.measuredPrCount === 1 ? "" : "s"} on record`,
    );
  }

  if (input.weightTrend === "up") {
    parts.push("body-weight 7-day average trending up");
  } else if (input.weightTrend === "down") {
    parts.push("body-weight 7-day average trending down");
  } else if (input.weightTrend === "flat") {
    parts.push("body-weight 7-day average roughly flat");
  }

  if (parts.length === 0) {
    return "No training aggregates yet. Complete a workout or log a weigh-in to populate this summary.";
  }

  return parts.join(". ") + ".";
}
