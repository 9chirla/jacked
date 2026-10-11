import { BrandMark } from "@/components/brand/BrandMark";
import { BottomNav } from "@/components/nav/BottomNav";
import { SyncBadge } from "@/components/pwa/SyncBadge";
import { requireAuthedUserId } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAuthedUserId();
  if (!auth) {
    redirect("/login");
  }

  const { data: profile } = await auth.supabase
    .from("profile")
    .select("onboarded_at, display_name")
    .eq("id", auth.userId)
    .maybeSingle();

  if (!profile?.onboarded_at) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <a
            href="/today"
            className="inline-flex min-h-12 items-center content-center"
          >
            <BrandMark size={36} />
          </a>
          <div className="flex items-center gap-1">
            <SyncBadge />
            <a
              href="/settings"
              className="inline-flex min-h-12 items-center rounded-[var(--radius)] px-3 text-[14px] text-muted hover:bg-surface hover:text-ink"
            >
              Settings
            </a>
          </div>
        </div>
      </header>
      <main className="flex-1 px-4 pt-4 pb-[calc(var(--nav-height)+var(--safe-bottom)+1rem)]">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
