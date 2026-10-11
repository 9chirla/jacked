import { mentionsPainOrInjury, PAIN_SAFETY_LINE } from "./pain-keywords";
import type {
  CoachClaim,
  CoachReport,
  CoachTone,
  NextSessionPrep,
} from "./types";

export type CoachAggregateInput = {
  tone: CoachTone;
  sessionsTarget: number;
  sessions7d: number;
  sessions28d: number;
  volume7d: number;
  volume28d: number;
  volumePrior28d: number;
  prs7d: number;
  hardSetsByPattern14d: Record<string, number>;
  /** Patterns expected in a balanced plan. */
  trackedPatterns: string[];
  streakWeeks: number;
  checkInToday: {
    fatigue: number;
    soreness: number;
    sleep: number | null;
    discomfortText: string | null;
  } | null;
  checkInEnabled: boolean;
  limitations: string | null;
  nextSession: NextSessionPrep | null;
};

let claimSeq = 0;
function claim(text: string, source: string): CoachClaim {
  claimSeq += 1;
  return { id: `c${claimSeq}`, text, source };
}

function lead(tone: CoachTone, numberLead: string, rest: string): string {
  // Analytical default: number first. Supportive/direct keep the same facts.
  if (tone === "supportive") {
    return `${numberLead} ${rest}`;
  }
  if (tone === "direct") {
    return `${numberLead}. ${rest}`;
  }
  return `${numberLead}: ${rest}`;
}

/**
 * Pure coach composer. Invents nothing — omits claims the aggregates cannot support.
 */
export function buildCoachReport(input: CoachAggregateInput): CoachReport {
  claimSeq = 0;
  const recentTraining: CoachClaim[] = [];
  const highlights: CoachClaim[] = [];
  const consistency: CoachClaim[] = [];
  const gaps: CoachClaim[] = [];
  const recovery: CoachClaim[] = [];
  const safety: CoachClaim[] = [
    claim(
      "Suggestions are training guidance from your logged data, not medical advice.",
      "policy=safety_disclaimer",
    ),
  ];

  // --- Recent training ---
  if (input.sessions7d === 0 && input.sessions28d === 0) {
    recentTraining.push(
      claim(
        lead(
          input.tone,
          "Based on 0 sessions in the last 7 days",
          "no volume, PRs, or adherence signal yet",
        ),
        "sessions_7d=0;sessions_28d=0",
      ),
    );
  } else {
    recentTraining.push(
      claim(
        lead(
          input.tone,
          `${input.sessions7d} sessions in the last 7 days`,
          `${Math.round(input.volume7d)} kg·reps working volume` +
            (input.prs7d > 0
              ? `, ${input.prs7d} measured PR${input.prs7d === 1 ? "" : "s"}`
              : ", no measured PRs"),
        ),
        `sessions_7d=${input.sessions7d};volume_7d=${Math.round(input.volume7d)};prs_7d=${input.prs7d}`,
      ),
    );
    recentTraining.push(
      claim(
        lead(
          input.tone,
          `${input.sessions28d} sessions in the last 28 days`,
          `${Math.round(input.volume28d)} kg·reps total working volume`,
        ),
        `sessions_28d=${input.sessions28d};volume_28d=${Math.round(input.volume28d)}`,
      ),
    );
  }

  // --- Consistency ---
  const target28 = input.sessionsTarget * 4;
  if (input.sessionsTarget > 0) {
    const rate =
      target28 > 0
        ? Math.min(1, input.sessions28d / target28)
        : null;
    if (rate != null && input.sessions28d + input.sessions7d > 0) {
      consistency.push(
        claim(
          lead(
            input.tone,
            `${Math.round(rate * 100)}% of your ${input.sessionsTarget}/week target over 28 days`,
            `${input.sessions28d} of ${target28} planned sessions`,
          ),
          `sessions_28d=${input.sessions28d};target_28d=${target28}`,
        ),
      );
    } else if (input.sessions28d === 0) {
      consistency.push(
        claim(
          lead(
            input.tone,
            "0 of your planned sessions logged in 28 days",
            `weekly target remains ${input.sessionsTarget}`,
          ),
          `sessions_28d=0;sessions_target=${input.sessionsTarget}`,
        ),
      );
    }
  }
  if (input.streakWeeks > 0) {
    consistency.push(
      claim(
        lead(
          input.tone,
          `Current streak ${input.streakWeeks} week${input.streakWeeks === 1 ? "" : "s"}`,
          "at least one completed session each ISO week (informational)",
        ),
        `streak_weeks=${input.streakWeeks}`,
      ),
    );
  }

  // --- Highlights (only genuine improvements) ---
  if (input.prs7d > 0) {
    highlights.push(
      claim(
        lead(
          input.tone,
          `${input.prs7d} measured PR${input.prs7d === 1 ? "" : "s"} in the last 7 days`,
          "from completed working sets flagged on save",
        ),
        `prs_7d=${input.prs7d}`,
      ),
    );
  }
  if (input.volume28d > 0 && input.volumePrior28d > 0) {
    const delta = input.volume28d - input.volumePrior28d;
    if (delta > 0) {
      highlights.push(
        claim(
          lead(
            input.tone,
            `Volume up ${Math.round(delta)} kg·reps vs the prior 28 days`,
            `${Math.round(input.volume28d)} vs ${Math.round(input.volumePrior28d)}`,
          ),
          `volume_28d=${Math.round(input.volume28d)};volume_prior_28d=${Math.round(input.volumePrior28d)}`,
        ),
      );
    }
  }
  if (highlights.length === 0) {
    highlights.push(
      claim(
        "No computed improvements in this window. Nothing fabricated is shown as a highlight.",
        "highlights=none",
      ),
    );
  }

  // --- Gaps (14d) ---
  for (const pattern of input.trackedPatterns) {
    const count = input.hardSetsByPattern14d[pattern] ?? 0;
    if (count === 0) {
      gaps.push(
        claim(
          lead(
            input.tone,
            `0 working sets on ${pattern} in the last 14 days`,
            "based on exercise primary_pattern in completed sessions",
          ),
          `pattern_14d=${pattern};sets=0`,
        ),
      );
    }
  }
  if (gaps.length === 0 && input.sessions28d > 0) {
    gaps.push(
      claim(
        "No pattern gaps in the tracked set over the last 14 days.",
        `patterns_checked=${input.trackedPatterns.join(",")}`,
      ),
    );
  }

  // --- Recovery / check-in ---
  if (input.checkInEnabled) {
    if (input.checkInToday) {
      const c = input.checkInToday;
      recovery.push(
        claim(
          lead(
            input.tone,
            `Today's check-in: fatigue ${c.fatigue}/5, soreness ${c.soreness}/5` +
              (c.sleep != null ? `, sleep ${c.sleep}/5` : ""),
            "stored as you entered it",
          ),
          `checkin_fatigue=${c.fatigue};checkin_soreness=${c.soreness};checkin_sleep=${c.sleep ?? "null"}`,
        ),
      );
      if (c.discomfortText?.trim()) {
        recovery.push(
          claim(
            `Discomfort note (verbatim): "${c.discomfortText.trim()}"`,
            "checkin_discomfort=verbatim",
          ),
        );
        if (mentionsPainOrInjury(c.discomfortText)) {
          safety.push(claim(PAIN_SAFETY_LINE, "policy=pain_keyword"));
        }
      }
    } else {
      recovery.push(
        claim(
          "No check-in logged for today yet.",
          "checkin_today=missing",
        ),
      );
    }
  }

  if (input.limitations?.trim()) {
    recovery.push(
      claim(
        `Noted limitation on file: ${input.limitations.trim()}`,
        "profile.limitations",
      ),
    );
  }

  const nextSessionClaims: CoachClaim[] = [];
  if (input.nextSession) {
    nextSessionClaims.push(
      claim(
        lead(
          input.tone,
          `Next session prep: ${input.nextSession.templateName}`,
          input.nextSession.reason,
        ),
        `template_id=${input.nextSession.templateId}`,
      ),
    );
    for (const ex of input.nextSession.exercises) {
      nextSessionClaims.push(
        claim(
          `${ex.exerciseName}: ${ex.suggestionText}` +
            (ex.lastSummary ? ` Last: ${ex.lastSummary}.` : " No prior working sets.") +
            ` Rule: ${ex.rule}.`,
          `exercise_id=${ex.exerciseId};rule=${ex.rule}`,
        ),
      );
    }
  } else {
    nextSessionClaims.push(
      claim(
        "No template available to prepare. Start or create a template first.",
        "template=none",
      ),
    );
  }

  return {
    recentTraining,
    highlights,
    consistency,
    gaps,
    nextSession: input.nextSession,
    nextSessionClaims,
    recovery,
    safety,
  };
}
