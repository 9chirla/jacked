"use client";

import { AppLink } from "@/components/nav/AppLink";
import { cn } from "@/lib/cn";
import {
  Activity,
  ClipboardList,
  Dumbbell,
  LineChart,
  MessageSquareText,
} from "lucide-react";
import { usePathname } from "next/navigation";

const items = [
  { href: "/today", label: "Today", icon: Activity },
  { href: "/history", label: "History", icon: ClipboardList },
  { href: "/log", label: "Log", icon: Dumbbell, primary: true },
  { href: "/progress", label: "Progress", icon: LineChart },
  { href: "/coach", label: "Coach", icon: MessageSquareText },
] as const;

/** Primary nav — soft Link + loading.tsx so taps stream a skeleton instead of a full reload. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md"
      style={{ paddingBottom: "var(--safe-bottom)" }}
    >
      <ul className="mx-auto grid h-[var(--nav-height)] max-w-lg grid-cols-5 items-end px-1">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          const primary = "primary" in item && item.primary;

          return (
            <li key={item.href} className="flex justify-center">
              <AppLink
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 min-w-14 flex-col items-center justify-center gap-1 rounded-[var(--radius)] px-2 text-[12px] transition-colors duration-150",
                  primary &&
                    "-mt-4 h-14 w-14 rounded-full border border-accent-ink/15 bg-accent text-accent-ink shadow-[0_8px_20px_var(--accent-glow)]",
                  !primary && (active ? "text-ink" : "text-muted"),
                )}
              >
                <Icon
                  aria-hidden
                  className={cn("h-6 w-6", primary && "h-7 w-7")}
                  strokeWidth={2}
                />
                <span className={cn(primary && "sr-only")}>{item.label}</span>
              </AppLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
