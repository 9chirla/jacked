import {
  BarChart3,
  Dumbbell,
  Ruler,
  Scale,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { RangeKey } from "@/lib/analytics/types";
import { cn } from "@/lib/cn";

export const PROGRESS_SECTIONS = [
  { id: "training", label: "Training", icon: BarChart3 },
  { id: "records", label: "Records", icon: Trophy },
  { id: "weight", label: "Weight", icon: Scale },
  { id: "body", label: "Body", icon: Ruler },
  { id: "suggestions", label: "Suggest", icon: Sparkles },
  { id: "muscles", label: "Muscles", icon: Dumbbell },
] as const;

export type ProgressSectionId = (typeof PROGRESS_SECTIONS)[number]["id"];

export function resolveProgressSection(
  raw: string | undefined,
  focus?: string,
): ProgressSectionId {
  if (focus === "weight") return "weight";
  if (PROGRESS_SECTIONS.some((s) => s.id === raw)) {
    return raw as ProgressSectionId;
  }
  return "training";
}

/**
 * Plain anchors — Next Link soft-nav + Flight on 16.3 was crashing with
 * `frame.join` / `enqueueModel` after section switches.
 */
export function ProgressSectionNav({
  current,
  range,
}: {
  current: ProgressSectionId;
  range: RangeKey;
}) {
  return (
    <nav aria-label="Progress sections">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {PROGRESS_SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = current === section.id;
          return (
            <li key={section.id}>
              <a
                href={`/progress?section=${section.id}&range=${range}`}
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
