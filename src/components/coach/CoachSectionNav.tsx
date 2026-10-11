import {
  Activity,
  ClipboardCheck,
  HeartPulse,
  ListChecks,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const COACH_SECTIONS = [
  { id: "checkin", label: "Check-in", icon: ClipboardCheck },
  { id: "summary", label: "Summary", icon: Activity },
  { id: "prep", label: "Prep", icon: ListChecks },
  { id: "gaps", label: "Gaps", icon: ScanSearch },
  { id: "recovery", label: "Recovery", icon: HeartPulse },
  { id: "more", label: "More", icon: Sparkles },
] as const;

export type CoachSectionId = (typeof COACH_SECTIONS)[number]["id"];

export function resolveCoachSection(raw: string | undefined): CoachSectionId {
  if (COACH_SECTIONS.some((s) => s.id === raw)) {
    return raw as CoachSectionId;
  }
  return "summary";
}

/**
 * Plain anchors — Next Link soft-nav + Flight on 16.3 was crashing the
 * overlay with `.stack` / `enqueueModel` after coach server actions.
 */
export function CoachSectionNav({ current }: { current: CoachSectionId }) {
  return (
    <nav aria-label="Coach sections">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {COACH_SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = current === section.id;
          return (
            <li key={section.id}>
              <a
                href={`/coach?section=${section.id}`}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border px-1 text-[12px] transition-colors",
                  active
                    ? "border-accent-ink/20 bg-accent text-accent-ink"
                    : "border-line bg-surface text-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden
                />
                <span>{section.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
