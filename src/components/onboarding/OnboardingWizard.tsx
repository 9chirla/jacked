"use client";

import { completeOnboarding } from "@/app/actions/profile";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { UnitInput } from "@/components/ui/UnitInput";
import type { OnboardingInput } from "@/lib/validation/profile";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const GOAL_OPTIONS = [
  { id: "muscle", label: "Build muscle" },
  { id: "fat_loss", label: "Lose fat" },
  { id: "strength", label: "Get stronger" },
  { id: "endurance", label: "Endurance / cardio" },
  { id: "general", label: "General fitness" },
  { id: "mobility", label: "Mobility" },
] as const;

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type Step = 0 | 1 | 2 | 3 | 4;

const defaults: OnboardingInput = {
  primary_goal: "muscle",
  goals: ["muscle", "fat_loss", "strength", "endurance", "general", "mobility"],
  experience_level: "intermediate",
  equipment_kind: "commercial_gym",
  training_location: "Commercial gym",
  current_routine: "",
  limitations: "",
  sessions_per_week: 3,
  session_minutes: 60,
  preferred_days: ["mon", "wed", "fri"],
  mass_unit: "kg",
  length_unit: "cm",
  height_cm: 173,
  current_weight_kg: 86.5,
  target_weight_kg: 75,
  weight_change_rate_kg_per_week: 0.65,
  logging_detail: "minimal",
  coaching_tone: "analytical",
  theme: "system",
  progression_model: "double_progression",
  rest_timer_enabled: true,
  checkin_enabled: true,
  cardio_separate: true,
  prefill_last: true,
  timeframe_months: 3,
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<OnboardingInput>(defaults);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const planPreview = useMemo(() => {
    const days = form.preferred_days?.length
      ? form.preferred_days.join(", ")
      : "editable days";
    return `Full Body ×${form.sessions_per_week} (A/B/A rotating) on ${days}. ~${form.session_minutes} min. Conditioning as a finisher or separate session — never before a heavy lower-body lift.`;
  }, [form.preferred_days, form.session_minutes, form.sessions_per_week]);

  function toggleGoal(id: OnboardingInput["goals"][number]) {
    setForm((current) => {
      const exists = current.goals.includes(id);
      const goals = exists
        ? current.goals.filter((g) => g !== id)
        : [...current.goals, id];
      return {
        ...current,
        goals: goals.length ? goals : [id],
        primary_goal: goals[0] ?? id,
      };
    });
  }

  function toggleDay(day: string) {
    setForm((current) => {
      const preferred = new Set(current.preferred_days ?? []);
      if (preferred.has(day)) preferred.delete(day);
      else preferred.add(day);
      return { ...current, preferred_days: [...preferred] };
    });
  }

  async function finish() {
    setSaving(true);
    setError(null);
    const result = await completeOnboarding(form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/today");
  }

  return (
    <div className="space-y-5">
      <p className="text-[14px] text-muted">Step {step + 1} of 5</p>

      {step === 0 ? (
        <section className="space-y-4">
          <h2 className="font-display text-[26px] font-semibold text-ink">
            Goals & experience
          </h2>
          <p className="text-[16px] text-muted">
            Priority order can be edited later. Defaults match your discovery
            answers.
          </p>
          <div className="flex flex-wrap gap-2">
            {GOAL_OPTIONS.map((goal) => (
              <Chip
                key={goal.id}
                selected={form.goals.includes(goal.id)}
                onClick={() => toggleGoal(goal.id)}
              >
                {goal.label}
              </Chip>
            ))}
          </div>
          <SegmentedControl
            ariaLabel="Experience level"
            value={form.experience_level}
            onChange={(experience_level) =>
              setForm((c) => ({ ...c, experience_level }))
            }
            options={[
              { value: "beginner", label: "Beginner" },
              { value: "intermediate", label: "Intermediate" },
              { value: "advanced", label: "Advanced" },
            ]}
          />
          <label className="block space-y-1">
            <span className="text-[14px] text-muted">
              Current routine (asked once)
            </span>
            <textarea
              value={form.current_routine ?? ""}
              onChange={(e) =>
                setForm((c) => ({ ...c, current_routine: e.target.value }))
              }
              rows={3}
              className="w-full rounded-[var(--radius)] border border-line bg-surface px-3 py-3 text-[16px] text-ink"
              placeholder="e.g. 3× full body, or nothing structured yet"
            />
          </label>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <h2 className="font-display text-[26px] font-semibold text-ink">
            Equipment & schedule
          </h2>
          <SegmentedControl
            ariaLabel="Equipment"
            value={form.equipment_kind}
            onChange={(equipment_kind) =>
              setForm((c) => ({ ...c, equipment_kind }))
            }
            options={[
              { value: "commercial_gym", label: "Gym" },
              { value: "home_full", label: "Home" },
              { value: "dumbbells", label: "DBs" },
            ]}
          />
          <label className="block space-y-1">
            <span className="text-[14px] text-muted">Sessions / week</span>
            <input
              type="number"
              min={1}
              max={7}
              inputMode="numeric"
              value={form.sessions_per_week}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  sessions_per_week: Number(e.target.value),
                }))
              }
              className="tabular min-h-12 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[14px] text-muted">Session length (min)</span>
            <input
              type="number"
              min={15}
              max={180}
              inputMode="numeric"
              value={form.session_minutes}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  session_minutes: Number(e.target.value),
                }))
              }
              className="tabular min-h-12 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px]"
            />
          </label>
          <div>
            <p className="mb-2 text-[14px] text-muted">Preferred days</p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <Chip
                  key={day}
                  selected={form.preferred_days?.includes(day)}
                  onClick={() => toggleDay(day)}
                >
                  {day}
                </Chip>
              ))}
            </div>
          </div>
          <label className="block space-y-1">
            <span className="text-[14px] text-muted">
              Limitations (stored & respected)
            </span>
            <textarea
              value={form.limitations ?? ""}
              onChange={(e) =>
                setForm((c) => ({ ...c, limitations: e.target.value }))
              }
              rows={3}
              className="w-full rounded-[var(--radius)] border border-line bg-surface px-3 py-3 text-[16px]"
              placeholder="Injuries, movements to avoid, or none"
            />
          </label>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <h2 className="font-display text-[26px] font-semibold text-ink">
            Body metrics
          </h2>
          <p className="text-[16px] text-muted">
            Stored in kg/cm. Display units are editable anytime without rewriting
            history.
          </p>
          <UnitInput
            label="Current body weight"
            unit="kg"
            value={String(form.current_weight_kg)}
            onChange={(v) =>
              setForm((c) => ({
                ...c,
                current_weight_kg: Number(v) || 0,
              }))
            }
          />
          <UnitInput
            label="Target body weight"
            unit="kg"
            value={String(form.target_weight_kg)}
            onChange={(v) =>
              setForm((c) => ({
                ...c,
                target_weight_kg: Number(v) || 0,
              }))
            }
          />
          <UnitInput
            label="Height"
            unit="cm"
            value={String(form.height_cm ?? "")}
            onChange={(v) =>
              setForm((c) => ({
                ...c,
                height_cm: Number(v) || undefined,
              }))
            }
          />
          <UnitInput
            label="Planned rate (not a guarantee)"
            unit="kg/wk"
            value={String(form.weight_change_rate_kg_per_week)}
            onChange={(v) =>
              setForm((c) => ({
                ...c,
                weight_change_rate_kg_per_week: Number(v) || 0.65,
              }))
            }
          />
          <p className="text-[14px] text-muted">
            Current {form.current_weight_kg} kg → {form.target_weight_kg} kg is a
            loss of{" "}
            {(form.current_weight_kg - form.target_weight_kg).toFixed(1)} kg
            over ~{form.timeframe_months} months at your configured rate.
          </p>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <h2 className="font-display text-[26px] font-semibold text-ink">
            Logging & coaching
          </h2>
          <SegmentedControl
            ariaLabel="Logging detail"
            value={form.logging_detail}
            onChange={(logging_detail) =>
              setForm((c) => ({ ...c, logging_detail }))
            }
            options={[
              { value: "minimal", label: "Minimal" },
              { value: "standard", label: "Standard" },
              { value: "detailed", label: "Detailed" },
            ]}
          />
          <SegmentedControl
            ariaLabel="Coaching tone"
            value={form.coaching_tone}
            onChange={(coaching_tone) =>
              setForm((c) => ({ ...c, coaching_tone }))
            }
            options={[
              { value: "analytical", label: "Analytical" },
              { value: "supportive", label: "Supportive" },
              { value: "direct", label: "Direct" },
            ]}
          />
          <SegmentedControl
            ariaLabel="Theme"
            value={form.theme}
            onChange={(theme) => setForm((c) => ({ ...c, theme }))}
            options={[
              { value: "system", label: "System" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
          <label className="flex min-h-12 items-center justify-between gap-3">
            <span>Rest timer (visual)</span>
            <input
              type="checkbox"
              checked={form.rest_timer_enabled}
              onChange={(e) =>
                setForm((c) => ({
                  ...c,
                  rest_timer_enabled: e.target.checked,
                }))
              }
              className="h-5 w-5"
            />
          </label>
          <label className="flex min-h-12 items-center justify-between gap-3">
            <span>Daily check-in</span>
            <input
              type="checkbox"
              checked={form.checkin_enabled}
              onChange={(e) =>
                setForm((c) => ({ ...c, checkin_enabled: e.target.checked }))
              }
              className="h-5 w-5"
            />
          </label>
          <label className="flex min-h-12 items-center justify-between gap-3">
            <span>Separate cardio sessions</span>
            <input
              type="checkbox"
              checked={form.cardio_separate}
              onChange={(e) =>
                setForm((c) => ({ ...c, cardio_separate: e.target.checked }))
              }
              className="h-5 w-5"
            />
          </label>
          <label className="flex min-h-12 items-center justify-between gap-3">
            <span>Always pre-fill last weight & reps</span>
            <input
              type="checkbox"
              checked={form.prefill_last}
              onChange={(e) =>
                setForm((c) => ({ ...c, prefill_last: e.target.checked }))
              }
              className="h-5 w-5"
            />
          </label>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-4">
          <h2 className="font-display text-[26px] font-semibold text-ink">
            Your plan
          </h2>
          <p className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 text-[16px] text-ink">
            {planPreview}
          </p>
          <p className="text-[14px] text-muted">
            Editable later in Settings. Changing preferences never rewrites
            logged history.
          </p>
        </section>
      ) : null}

      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-3">
        {step > 0 ? (
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => setStep((s) => (s - 1) as Step)}
          >
            Back
          </Button>
        ) : null}
        {step < 4 ? (
          <Button
            className="flex-1"
            onClick={() => setStep((s) => (s + 1) as Step)}
          >
            Continue
          </Button>
        ) : (
          <Button className="flex-1" disabled={saving} onClick={finish}>
            {saving ? "Saving…" : "Finish"}
          </Button>
        )}
      </div>
    </div>
  );
}
