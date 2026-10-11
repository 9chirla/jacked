import {
  Database,
  Info,
  Palette,
  UserRound,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const SETTINGS_SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "offline", label: "Offline", icon: WifiOff },
  { id: "data", label: "Data", icon: Database },
  { id: "about", label: "About", icon: Info },
] as const;

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

export function resolveSettingsSection(
  raw: string | undefined,
): SettingsSectionId {
  if (SETTINGS_SECTIONS.some((s) => s.id === raw)) {
    return raw as SettingsSectionId;
  }
  return "profile";
}

/** Plain anchors — same Flight-safe pattern as Coach section nav. */
export function SettingsSectionNav({
  current,
}: {
  current: SettingsSectionId;
}) {
  return (
    <nav aria-label="Settings sections">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = current === section.id;
          return (
            <li key={section.id}>
              <a
                href={`/settings?section=${section.id}`}
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
