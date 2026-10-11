/** Keywords that trigger the single permitted non-diagnostic safety line. */
const PAIN_PATTERN =
  /\b(pain|injury|injured|swelling|numb|numbness|sharp|tear|torn|fracture|sprain|strain|doctor|physio|physical therapy)\b/i;

export function mentionsPainOrInjury(text: string | null | undefined): boolean {
  if (!text || !text.trim()) return false;
  return PAIN_PATTERN.test(text);
}

export const PAIN_SAFETY_LINE =
  "If discomfort persists, have it assessed by a qualified professional. This app does not diagnose injuries.";
