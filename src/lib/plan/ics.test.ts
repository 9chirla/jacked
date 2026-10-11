import { describe, expect, it } from "vitest";
import { buildSundayReminderIcs } from "@/lib/plan/ics";

describe("buildSundayReminderIcs", () => {
  it("emits required fields, CRLF, RRULE, and VALARM", () => {
    const ics = buildSundayReminderIcs({
      time: "09:00",
      timeZone: "Europe/London",
      plannerUrl: "https://jacked-gold.vercel.app/plan",
    });
    expect(ics.includes("\r\n")).toBe(true);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("UID:");
    expect(ics).toContain("DTSTAMP:");
    expect(ics).toContain("RRULE:FREQ=WEEKLY;BYDAY=SU");
    expect(ics).toContain("BEGIN:VALARM");
    expect(ics).toContain("TRIGGER:-PT15M");
    expect(ics).toContain("https://jacked-gold.vercel.app/plan");
    expect(ics).toContain("calendar reminder");
  });
});
