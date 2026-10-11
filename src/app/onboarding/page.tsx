import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Onboarding",
};

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profile")
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarded_at) {
    redirect("/today");
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 py-8">
      <p className="font-display text-[26px] font-semibold text-ink">Jacked</p>
      <p className="mt-1 text-[14px] text-muted">Personal setup — once</p>
      <div className="mt-6">
        <OnboardingWizard />
      </div>
    </div>
  );
}
