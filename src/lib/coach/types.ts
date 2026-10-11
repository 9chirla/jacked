/** Every coach sentence must cite a source key so claims stay falsifiable. */
export type CoachClaim = {
  id: string;
  text: string;
  /** Machine-readable provenance, e.g. `sessions_7d=2;volume_7d=1840`. */
  source: string;
};

export type CoachTone = "analytical" | "supportive" | "direct";

export type NextSessionPrep = {
  templateId: string;
  templateName: string;
  reason: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    lastSummary: string | null;
    suggestionText: string;
    rule: string;
  }>;
};

export type CoachReport = {
  recentTraining: CoachClaim[];
  highlights: CoachClaim[];
  consistency: CoachClaim[];
  gaps: CoachClaim[];
  nextSession: NextSessionPrep | null;
  nextSessionClaims: CoachClaim[];
  recovery: CoachClaim[];
  safety: CoachClaim[];
};
