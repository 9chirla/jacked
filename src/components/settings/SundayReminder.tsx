"use client";

import { Button } from "@/components/ui/Button";
import { buildSundayReminderIcs } from "@/lib/plan/ics";
import { useMemo, useState } from "react";

type Props = {
  appUrl: string;
  timeZone: string;
};

export function SundayReminder({ appUrl, timeZone }: Props) {
  const [time, setTime] = useState("09:00");
  const deviceTz =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : timeZone;
  const tz = deviceTz || timeZone || "UTC";
  const plannerUrl = `${appUrl.replace(/\/$/, "")}/plan`;

  const ics = useMemo(
    () =>
      buildSundayReminderIcs({
        time,
        timeZone: tz,
        plannerUrl,
      }),
    [time, tz, plannerUrl],
  );

  return (
    <div className="space-y-3">
      <p className="text-[14px] text-muted">
        Download a weekly Sunday calendar event with a 15-minute alarm. This is
        a phone Calendar reminder, not an in-app notification.
      </p>
      <label className="block space-y-1">
        <span className="text-[14px] text-muted">Local time</span>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-bg px-3 text-[16px]"
        />
      </label>
      <Button
        className="w-full"
        onClick={() => {
          const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "jacked-sunday-plan.ics";
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Download Sunday .ics
      </Button>
    </div>
  );
}
