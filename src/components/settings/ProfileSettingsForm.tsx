"use client";

import { updateProfileSettings } from "@/app/actions/profile";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toast } from "@/components/ui/Toast";
import { useState } from "react";

type ProfileRow = {
  display_name: string | null;
  mass_unit: "kg" | "lb";
  length_unit: "cm" | "in";
  coaching_tone: string;
  logging_detail: string;
  progression_model: string;
  theme: "system" | "light" | "dark";
  sessions_per_week: number;
  session_minutes: number;
  limitations: string | null;
};

export function ProfileSettingsForm({ profile }: { profile: ProfileRow }) {
  const [form, setForm] = useState(profile);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const result = await updateProfileSettings({
      display_name: form.display_name ?? undefined,
      mass_unit: form.mass_unit,
      length_unit: form.length_unit,
      coaching_tone: form.coaching_tone,
      logging_detail: form.logging_detail,
      progression_model: form.progression_model,
      theme: form.theme,
      sessions_per_week: form.sessions_per_week,
      session_minutes: form.session_minutes,
      limitations: form.limitations ?? "",
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessage("Settings saved. History was not rewritten.");
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-1">
        <span className="text-[14px] text-muted">Display name</span>
        <input
          value={form.display_name ?? ""}
          onChange={(e) =>
            setForm((c) => ({ ...c, display_name: e.target.value }))
          }
          className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px]"
        />
      </label>

      <div>
        <p className="mb-2 text-[14px] text-muted">Mass unit</p>
        <SegmentedControl
          ariaLabel="Mass unit"
          value={form.mass_unit}
          onChange={(mass_unit) => setForm((c) => ({ ...c, mass_unit }))}
          options={[
            { value: "kg", label: "kg" },
            { value: "lb", label: "lb" },
          ]}
        />
      </div>

      <div>
        <p className="mb-2 text-[14px] text-muted">Length unit</p>
        <SegmentedControl
          ariaLabel="Length unit"
          value={form.length_unit}
          onChange={(length_unit) => setForm((c) => ({ ...c, length_unit }))}
          options={[
            { value: "cm", label: "cm" },
            { value: "in", label: "in" },
          ]}
        />
      </div>

      <div>
        <p className="mb-2 text-[14px] text-muted">Theme</p>
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
      </div>

      <label className="block space-y-1">
        <span className="text-[14px] text-muted">Limitations</span>
        <textarea
          value={form.limitations ?? ""}
          onChange={(e) =>
            setForm((c) => ({ ...c, limitations: e.target.value }))
          }
          rows={3}
          className="w-full rounded-[var(--radius)] border border-line bg-surface px-3 py-3 text-[16px]"
        />
      </label>

      <p className="text-[14px] text-muted">
        Progression: double progression (2-for-2). Logging: {form.logging_detail}.
        Coaching: {form.coaching_tone}.
      </p>

      <Button className="w-full" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save profile"}
      </Button>
      {message ? <Toast tone="success" message={message} /> : null}
      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
