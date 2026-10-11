import { AppLink } from "@/components/nav/AppLink";
import type { RangeKey } from "@/lib/analytics/types";
import { cn } from "@/lib/cn";

const OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "4w", label: "4w" },
  { key: "3m", label: "3m" },
  { key: "6m", label: "6m" },
  { key: "1y", label: "1y" },
  { key: "all", label: "All" },
];

export function RangeSwitcher({
  current,
  section,
}: {
  current: RangeKey;
  section?: string;
}) {
  return (
    <div
      className="flex flex-wrap gap-1"
      role="navigation"
      aria-label="Chart range"
    >
      {OPTIONS.map((opt) => {
        const params = new URLSearchParams();
        if (section) params.set("section", section);
        params.set("range", opt.key);
        return (
          <AppLink
            key={opt.key}
            href={`/progress?${params.toString()}`}
            className={cn(
              "min-h-11 min-w-11 px-3 text-center text-[14px] leading-[44px]",
              current === opt.key
                ? "bg-accent font-medium text-accent-ink"
                : "bg-surface text-muted",
            )}
            aria-current={current === opt.key ? "page" : undefined}
          >
            {opt.label}
          </AppLink>
        );
      })}
    </div>
  );
}
