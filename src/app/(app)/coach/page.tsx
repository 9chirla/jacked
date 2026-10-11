import { upsertDailyCheckIn } from "@/app/actions/checkin";
import { CheckInForm } from "@/components/coach/CheckInForm";
import { ClaimList } from "@/components/coach/ClaimList";
import {
  CoachSectionNav,
  resolveCoachSection,
} from "@/components/coach/CoachSectionNav";
import { Card } from "@/components/ui/Card";
import { loadCoachReport } from "@/lib/coach/load-coach";

export const metadata = {
  title: "Coach",
};

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section: sectionRaw } = await searchParams;
  const section = resolveCoachSection(sectionRaw);
  const data = await loadCoachReport();
  if (!data) {
    return (
      <div className="motion-settle space-y-4">
        <h1 className="font-display text-[34px] font-semibold text-ink">
          Coach
        </h1>
        <p className="text-[16px] text-muted">Sign in to see coaching.</p>
      </div>
    );
  }

  const { report, checkInEnabled, checkInToday, todayIso, tone, loadError } =
    data;
  const prepWithHistory =
    report.nextSession?.exercises.filter((ex) => ex.lastSummary) ?? [];
  const prepNew =
    report.nextSession?.exercises.filter((ex) => !ex.lastSummary) ?? [];

  return (
    <div className="motion-settle space-y-4">
      <section className="space-y-3">
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          Coach
        </h1>
        <p className="text-[16px] text-muted">
          Rule-based ({tone}). Claims come from your logs only.
        </p>
        {loadError ? (
          <p className="text-[14px] text-muted">
            Some coach data could not load. Showing a safe empty summary —
            hard-refresh after applying SQL archive 06 if check-ins fail.
          </p>
        ) : null}
        <CoachSectionNav current={section} />
      </section>

      {section === "checkin" ? (
        checkInEnabled ? (
          <Card className="space-y-3">
            <h2 className="font-display text-[20px] font-semibold text-ink">
              Daily check-in
            </h2>
            <p className="text-[14px] text-muted">
              One prompt per day. Discomfort notes are stored verbatim and never
              diagnosed.
            </p>
            <CheckInForm
              defaultDate={todayIso}
              initial={checkInToday}
              upsertAction={upsertDailyCheckIn}
            />
          </Card>
        ) : (
          <Card>
            <p className="text-[16px] text-ink">
              Daily check-in is off in settings.
            </p>
          </Card>
        )
      ) : null}

      {section === "summary" ? (
        <div className="space-y-4">
          <ClaimList title="Recent training" claims={report.recentTraining} />
          <ClaimList title="Highlights" claims={report.highlights} />
          <ClaimList title="Consistency" claims={report.consistency} />
        </div>
      ) : null}

      {section === "prep" ? (
        <Card className="space-y-3">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            Next session prep
          </h2>
          {report.nextSession ? (
            <>
              <p className="text-[16px] text-ink">
                {report.nextSession.templateName}
              </p>
              <p className="text-[14px] text-muted">
                {report.nextSession.reason}
              </p>
              {prepWithHistory.length > 0 ? (
                <ul className="space-y-3">
                  {prepWithHistory.map((ex) => (
                    <li key={ex.exerciseId} className="text-[14px]">
                      <p className="font-medium text-ink">{ex.exerciseName}</p>
                      <p className="text-muted">Last: {ex.lastSummary}</p>
                      <p className="text-ink">{ex.suggestionText}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {prepNew.length > 0 ? (
                <div className="space-y-1">
                  <p className="text-[14px] text-muted">
                    Not logged yet — enter a starting load when you train:
                  </p>
                  <p className="text-[14px] text-ink">
                    {prepNew.map((ex) => ex.exerciseName).join(" · ")}
                  </p>
                </div>
              ) : null}
              <a
                href="/templates"
                className="inline-flex min-h-12 items-center text-[14px] text-muted underline-offset-4 hover:underline"
              >
                Open templates to start
              </a>
            </>
          ) : (
            <p className="text-[16px] text-ink">
              No template available. Create or activate one first.
            </p>
          )}
        </Card>
      ) : null}

      {section === "gaps" ? (
        <ClaimList title="Gaps (14 days)" claims={report.gaps} />
      ) : null}

      {section === "recovery" ? (
        <div className="space-y-4">
          <ClaimList title="Recovery" claims={report.recovery} />
          {!checkInToday && checkInEnabled ? (
            <p className="text-[14px]">
              <a
                href="/coach?section=checkin"
                className="text-muted underline-offset-4 hover:underline"
              >
                Log today&apos;s check-in
              </a>
            </p>
          ) : null}
        </div>
      ) : null}

      {section === "more" ? (
        <div className="space-y-4">
          <ClaimList title="Safety" claims={report.safety} />
          <Card>
            <p className="text-[12px] uppercase tracking-[0.04em] text-muted">
              Optional AI narration
            </p>
            <p className="mt-2 text-[16px] text-ink">
              Off. No API key configured. Rule-based coach stays the source of
              truth.
            </p>
          </Card>
          <a
            href="/settings"
            className="inline-flex min-h-12 items-center text-[14px] text-muted underline-offset-4 hover:underline"
          >
            Theme & preferences
          </a>
        </div>
      ) : null}
    </div>
  );
}
