import { RangeSwitcher } from "@/components/analytics/RangeSwitcher";
import { ClientWeightTrendChart } from "@/components/progress/ClientCharts";
import {
  DeleteMeasurementButton,
  MeasurementForm,
} from "@/components/progress/MeasurementForm";
import {
  ProgressSectionNav,
  resolveProgressSection,
} from "@/components/progress/ProgressSectionNav";
import { ProgressionCard } from "@/components/progress/ProgressionCard";
import { ProgressPhotos } from "@/components/progress/ProgressPhotos";
import {
  DeleteWeighInButton,
  WeighInForm,
} from "@/components/progress/WeighInForm";
import { BarChart } from "@/components/ui/BarChart";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatTile } from "@/components/ui/StatTile";
import {
  analyticsBundle,
  hardSetsByMuscleLast7Days,
  listEstimatedE1rmPrs,
  listMeasuredPrs,
  resolveRange,
} from "@/lib/analytics/queries";
import { buildAnalyticsSummary } from "@/lib/analytics/summary";
import {
  centredSevenDayAverage,
  centredSlopeKgPerWeek,
  deltaVsDaysAgo,
} from "@/lib/calculations/rolling-average";
import {
  formatMass,
  kgToLb,
  roundMassDisplay,
} from "@/lib/calculations/units";
import { suggestionsForRecentExercises } from "@/lib/progress/progression-data";
import {
  listMeasurements,
  listWeighIns,
  sessionStats,
} from "@/lib/progress/weight-data";
import { requireAuthedUserId } from "@/lib/supabase/auth";

export const metadata = {
  title: "Progress",
};

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; range?: string; section?: string }>;
}) {
  const { focus, range: rangeRaw, section: sectionRaw } = await searchParams;
  const range = resolveRange(rangeRaw);
  const section = resolveProgressSection(sectionRaw, focus);
  const auth = await requireAuthedUserId();
  if (!auth) {
    return (
      <EmptyState
        title="Sign in required"
        description="Open Progress again after signing in."
      />
    );
  }

  const { data: profile } = await auth.supabase
    .from("profile")
    .select("mass_unit, length_unit, sessions_per_week, photos_enabled")
    .eq("id", auth.userId)
    .maybeSingle();

  const massUnit = (profile?.mass_unit as "kg" | "lb") ?? "kg";
  const lengthUnit = (profile?.length_unit as "cm" | "in") ?? "cm";
  const sessionsTarget = profile?.sessions_per_week ?? 3;
  const photosEnabled = profile?.photos_enabled !== false;
  const todayIso = new Date().toISOString().slice(0, 10);

  // Header tiles — light query only. Section bodies load what they need.
  const stats = await sessionStats(auth.userId, sessionsTarget);

  let weighIns: Awaited<ReturnType<typeof listWeighIns>> = [];
  let measurements: Awaited<ReturnType<typeof listMeasurements>> = [];
  let suggestions: Awaited<ReturnType<typeof suggestionsForRecentExercises>> =
    [];
  let bundle: Awaited<ReturnType<typeof analyticsBundle>> | null = null;
  let measuredPrs: Awaited<ReturnType<typeof listMeasuredPrs>> = [];
  let estimatedPrs: Awaited<ReturnType<typeof listEstimatedE1rmPrs>> = [];
  let hardSets: Awaited<ReturnType<typeof hardSetsByMuscleLast7Days>> = [];

  if (section === "training") {
    bundle = await analyticsBundle({
      sessionsPerWeek: sessionsTarget,
      range,
    });
  } else if (section === "records") {
    [measuredPrs, estimatedPrs] = await Promise.all([
      listMeasuredPrs(),
      listEstimatedE1rmPrs(),
    ]);
  } else if (section === "weight") {
    weighIns = await listWeighIns();
  } else if (section === "body") {
    measurements = await listMeasurements();
  } else if (section === "suggestions") {
    suggestions = await suggestionsForRecentExercises(4);
  } else if (section === "muscles") {
    hardSets = await hardSetsByMuscleLast7Days();
  }

  const rolling = centredSevenDayAverage(
    weighIns.map((w) => ({ date: w.date, weightKg: w.weightKg })),
  );
  const latest = weighIns[weighIns.length - 1] ?? null;
  const d7 = deltaVsDaysAgo(
    weighIns.map((w) => ({ date: w.date, weightKg: w.weightKg })),
    7,
  );
  const d30 = deltaVsDaysAgo(
    weighIns.map((w) => ({ date: w.date, weightKg: w.weightKg })),
    30,
  );
  const slope = centredSlopeKgPerWeek(rolling);

  const latestAvg = [...rolling]
    .reverse()
    .find((p) => p.centredAvgKg != null)?.centredAvgKg;

  let weightTrend: "up" | "down" | "flat" | null = null;
  if (slope != null) {
    if (Math.abs(slope) < 0.05) weightTrend = "flat";
    else weightTrend = slope > 0 ? "up" : "down";
  }

  const summary = buildAnalyticsSummary({
    sessionsThisWeek: stats.sessionsThisWeek,
    sessionsTarget,
    streakWeeks: stats.streakWeeks,
    volumeDelta: bundle?.volumeDelta.delta ?? null,
    measuredPrCount: measuredPrs.length,
    weightTrend: section === "weight" ? weightTrend : null,
  });

  const volumeUnit = massUnit === "lb" ? "lb·reps" : "kg·reps";
  const volumeBars = (bundle?.volumeBars ?? []).map((b) => ({
    label: b.label,
    value:
      massUnit === "lb"
        ? roundMassDisplay(kgToLb(b.volume))
        : Math.round(b.volume),
  }));
  const frequencyBars = (bundle?.frequencyBars ?? []).map((b) => ({
    label: b.label,
    value: b.count,
  }));
  const muscleBars = hardSets.map((m) => ({
    label: m.muscle.replaceAll("_", " "),
    value: m.sets,
  }));

  return (
    <div className="motion-settle space-y-5">
      <section className="space-y-3">
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          Progress
        </h1>
        <p className="text-[16px] text-muted">{summary}</p>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            label="Sessions"
            value={`${stats.sessionsThisWeek}`}
            hint={`of ${sessionsTarget} / week`}
          />
          <StatTile
            label="Streak"
            value={`${stats.streakWeeks}`}
            hint="Weeks with ≥1 session"
          />
        </div>
        <ProgressSectionNav current={section} range={range} />
      </section>

      {section === "training" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-[22px] font-semibold text-ink">
              Training
            </h2>
            <RangeSwitcher current={range} section={section} />
          </div>
          <p className="text-[14px] text-muted">
            Weeks start from your first logged session. Empty weeks after that
            stay as gaps.
          </p>
          {bundle?.completionRate4w != null ? (
            <p className="text-[14px] text-muted">
              4-week completion{" "}
              <span className="tabular text-ink">
                {Math.round(bundle.completionRate4w * 100)}%
              </span>
              {bundle.volumeDelta.delta != null ? (
                <>
                  {" "}
                  · volume vs prior 4w{" "}
                  <span className="tabular text-ink">
                    {bundle.volumeDelta.delta >= 0 ? "+" : ""}
                    {massUnit === "lb"
                      ? roundMassDisplay(kgToLb(bundle.volumeDelta.delta))
                      : Math.round(bundle.volumeDelta.delta)}{" "}
                    {volumeUnit}
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
          <Card className="space-y-3">
            <h3 className="text-[16px] font-medium text-ink">Weekly volume</h3>
            <BarChart
              bars={volumeBars.some((b) => b.value > 0) ? volumeBars : []}
              label="Working-set volume by ISO week"
              unit={volumeUnit}
              emptyMessage="Complete a workout to start the record"
            />
          </Card>
          <Card className="space-y-3">
            <h3 className="text-[16px] font-medium text-ink">
              Frequency & consistency
            </h3>
            <BarChart
              bars={
                frequencyBars.some((b) => b.value > 0) ? frequencyBars : []
              }
              label={`Sessions per week (target ${sessionsTarget})`}
              unit="sessions"
              emptyMessage="Nothing scheduled yet — set your weekly target"
            />
          </Card>
        </div>
      ) : null}

      {section === "records" ? (
        <Card className="space-y-3">
          <h2 className="font-display text-[22px] font-semibold text-ink">
            Personal records
          </h2>
          <h3 className="text-[14px] font-medium text-ink">Measured PRs</h3>
          {measuredPrs.length === 0 ? (
            <p className="text-[14px] text-muted">No PRs recorded yet.</p>
          ) : (
            <ul className="space-y-2 text-[14px]">
              {measuredPrs.map((pr) => (
                <li
                  key={pr.setId}
                  className="flex items-center justify-between gap-3"
                >
                  <a
                    href={`/progress/exercises/${pr.exerciseId}`}
                    className="text-ink underline-offset-2 hover:underline"
                  >
                    {pr.exerciseName}
                  </a>
                  <span className="tabular text-muted">
                    {formatMass(pr.load, massUnit)} × {pr.reps}
                    {pr.completedAt
                      ? ` · ${pr.completedAt.slice(0, 10)}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <h3 className="pt-2 text-[14px] font-medium text-ink">
            Estimated 1RM (Epley, derived)
          </h3>
          {estimatedPrs.length === 0 ? (
            <p className="text-[14px] text-muted">
              No estimated 1RM values yet — need completed working sets at ≤10
              reps.
            </p>
          ) : (
            <ul className="space-y-2 text-[14px]">
              {estimatedPrs.map((pr) => (
                <li
                  key={pr.setId}
                  className="flex items-center justify-between gap-3"
                >
                  <a
                    href={`/progress/exercises/${pr.exerciseId}`}
                    className="text-ink underline-offset-2 hover:underline"
                  >
                    {pr.exerciseName}
                  </a>
                  <span className="tabular text-muted">
                    {formatMass(pr.e1rm, massUnit)} e1RM from{" "}
                    {formatMass(pr.load, massUnit)} × {pr.reps}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {section === "weight" ? (
        <Card className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Body weight"
              value={latest ? formatMass(latest.weightKg, massUnit) : "—"}
              hint={
                latestAvg != null
                  ? `7-day avg ${formatMass(latestAvg, massUnit)} (derived)`
                  : "No 7-day average yet"
              }
            />
            <StatTile
              label="Δ 7 / 30 days"
              value={
                d7 == null && d30 == null
                  ? "—"
                  : `${d7 == null ? "—" : `${d7 >= 0 ? "+" : ""}${roundMassDisplay(d7)}`} / ${d30 == null ? "—" : `${d30 >= 0 ? "+" : ""}${roundMassDisplay(d30)}`}`
              }
              hint={
                slope == null
                  ? "Need more centred averages for slope"
                  : `Slope ${slope >= 0 ? "+" : ""}${roundMassDisplay(slope)} kg/week`
              }
            />
          </div>
          <h2 className="font-display text-[22px] font-semibold text-ink">
            Weigh-in
          </h2>
          <WeighInForm
            massUnit={massUnit}
            latestKg={latest?.weightKg ?? null}
            defaultDate={todayIso}
          />
          <ClientWeightTrendChart points={rolling} unitLabel={massUnit} />
          {weighIns.length === 0 ? (
            <EmptyState
              title="Add your first weigh-in"
              description="The chart only shows values you save — nothing is fabricated."
            />
          ) : (
            <ul className="space-y-2">
              {[...weighIns].reverse().slice(0, 8).map((w) => (
                <li
                  key={w.id}
                  className="flex items-center justify-between gap-3 text-[14px]"
                >
                  <span className="text-muted">{w.date}</span>
                  <span className="tabular text-ink">
                    {formatMass(w.weightKg, massUnit)}
                    {w.context ? ` · ${w.context.replaceAll("_", " ")}` : ""}
                  </span>
                  <DeleteWeighInButton id={w.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      {section === "body" ? (
        <>
          <Card className="space-y-4">
            <h2 className="font-display text-[22px] font-semibold text-ink">
              Measurements
            </h2>
            <MeasurementForm lengthUnit={lengthUnit} defaultDate={todayIso} />
            {measurements.length === 0 ? (
              <p className="text-[14px] text-muted">
                No measurements logged yet.
              </p>
            ) : (
              <ul className="space-y-2 text-[14px]">
                {measurements.slice(0, 10).map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-muted">
                      {m.date} · {m.site.replaceAll("_", " ")}
                    </span>
                    <span className="tabular text-ink">{m.valueCm} cm</span>
                    <DeleteMeasurementButton id={m.id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="space-y-3">
            <h2 className="font-display text-[22px] font-semibold text-ink">
              Photos
            </h2>
            <ProgressPhotos enabled={photosEnabled} defaultDate={todayIso} />
          </Card>
        </>
      ) : null}

      {section === "suggestions" ? (
        <section className="space-y-3">
          <h2 className="font-display text-[22px] font-semibold text-ink">
            Progression
          </h2>
          <p className="text-[14px] text-muted">
            Suggestions from your logged history using double progression.
            Training guidance, not medical advice.
          </p>
          {suggestions.length === 0 ? (
            <EmptyState
              title="No progression inputs yet"
              description="Complete a workout with working sets to unlock explainable suggestions."
            />
          ) : (
            suggestions.map((s) => (
              <div key={s.exerciseId} className="space-y-1">
                <ProgressionCard
                  exerciseId={s.exerciseId}
                  exerciseName={s.exerciseName}
                  suggestion={s.suggestion}
                />
                <p className="text-[14px]">
                  <a
                    href={`/progress/exercises/${s.exerciseId}`}
                    className="text-muted underline-offset-2 hover:underline"
                  >
                    View exercise history
                  </a>
                </p>
              </div>
            ))
          )}
        </section>
      ) : null}

      {section === "muscles" ? (
        <Card className="space-y-3">
          <h2 className="font-display text-[22px] font-semibold text-ink">
            Hard sets (7 days)
          </h2>
          <BarChart
            bars={muscleBars}
            label="Working sets per muscle group"
            unit="sets"
            emptyMessage="No sets logged in the last 7 days"
          />
        </Card>
      ) : null}
    </div>
  );
}
