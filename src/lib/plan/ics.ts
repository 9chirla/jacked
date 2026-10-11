/**
 * Weekly Sunday reminder .ics (calendar reminder — not an in-app notification).
 */

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  parts.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  return parts.join("\r\n");
}

function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

export type SundayReminderInput = {
  /** HH:mm local wall time (default 09:00). */
  time: string;
  /** IANA timezone e.g. Europe/London */
  timeZone: string;
  /** Absolute URL to the planner */
  plannerUrl: string;
  /** Stable UID fragment */
  uidHost?: string;
};

/** Build a VCALENDAR with weekly SU event + 15-minute VALARM. */
export function buildSundayReminderIcs(input: SundayReminderInput): string {
  const [hhRaw, mmRaw] = input.time.split(":");
  const hh = String(Math.min(23, Math.max(0, Number(hhRaw) || 9))).padStart(
    2,
    "0",
  );
  const mm = String(Math.min(59, Math.max(0, Number(mmRaw) || 0))).padStart(
    2,
    "0",
  );
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
  const uid = `jacked-sunday-${hh}${mm}@${input.uidHost ?? "jacked.app"}`;
  // Floating local time + TZID (calendar apps resolve).
  const dtStart = `20261012T${hh}${mm}00`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jacked//Sunday Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${input.timeZone}:${dtStart}`,
    "RRULE:FREQ=WEEKLY;BYDAY=SU",
    "DURATION:PT15M",
    `SUMMARY:${escapeText("Jacked — plan this week")}`,
    `DESCRIPTION:${escapeText(
      `Open the planner: ${input.plannerUrl}\n(This is a calendar reminder, not an app notification.)`,
    )}`,
    `URL:${input.plannerUrl}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Plan your Jacked week",
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}
