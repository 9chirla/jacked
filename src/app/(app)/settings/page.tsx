import { DataOwnership } from "@/components/settings/DataOwnership";
import { OfflineMatrix } from "@/components/settings/OfflineMatrix";
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";
import {
  resolveSettingsSection,
  SettingsSectionNav,
} from "@/components/settings/SettingsSectionNav";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { Card } from "@/components/ui/Card";
import { APP_VERSION, EXPORT_SCHEMA_VERSION } from "@/lib/data/schema-version";
import { requireAuthedUserId } from "@/lib/supabase/auth";

export const metadata = {
  title: "Settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section: sectionRaw } = await searchParams;
  const section = resolveSettingsSection(sectionRaw);

  const auth = await requireAuthedUserId();
  if (!auth) return null;

  const emailClaim = auth.claims?.email;
  const email =
    typeof emailClaim === "string" && emailClaim.length > 0
      ? emailClaim
      : "your account";

  const { data: profile } = await auth.supabase
    .from("profile")
    .select(
      "display_name, mass_unit, length_unit, coaching_tone, logging_detail, progression_model, theme, sessions_per_week, session_minutes, limitations",
    )
    .eq("id", auth.userId)
    .single();

  return (
    <div className="motion-settle space-y-4">
      <section className="space-y-3">
        <div>
          <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
            Settings
          </h1>
          <p className="mt-2 text-[16px] text-muted">
            Signed in as {email}. Preference changes never rewrite training
            history.
          </p>
        </div>
        <SettingsSectionNav current={section} />
      </section>

      {section === "profile" ? (
        <Card className="space-y-3">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            Profile & units
          </h2>
          {profile ? <ProfileSettingsForm profile={profile} /> : null}
        </Card>
      ) : null}

      {section === "theme" ? (
        <Card className="space-y-3">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            Device theme
          </h2>
          <p className="text-[14px] text-muted">
            Local override for this browser/PWA. Profile theme is also saved in
            Profile.
          </p>
          <ThemeSettings />
        </Card>
      ) : null}

      {section === "offline" ? (
        <Card className="space-y-3">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            Offline & install
          </h2>
          <OfflineMatrix />
        </Card>
      ) : null}

      {section === "data" ? (
        <Card className="space-y-3">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            Data ownership
          </h2>
          <DataOwnership />
        </Card>
      ) : null}

      {section === "about" ? (
        <Card className="space-y-2">
          <h2 className="font-display text-[20px] font-semibold text-ink">
            About
          </h2>
          <dl className="space-y-2 text-[14px]">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">App</dt>
              <dd className="tabular text-ink">Jacked {APP_VERSION}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Export schema</dt>
              <dd className="tabular text-ink">{EXPORT_SCHEMA_VERSION}</dd>
            </div>
          </dl>
          <a
            href="/offline"
            className="inline-flex min-h-12 items-center text-[14px] text-muted underline-offset-4 hover:underline"
          >
            Offline fallback
          </a>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="mt-2 inline-flex min-h-12 items-center text-[14px] text-danger"
            >
              Sign out
            </button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
