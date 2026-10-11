import { LoginForm } from "@/components/auth/LoginForm";
import { BrandMark } from "@/components/brand/BrandMark";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    redirect("/today");
  }

  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-10">
      <BrandMark size={48} />
      <h1 className="font-display mt-2 text-[34px] font-semibold tracking-tight text-ink">
        Sign in
      </h1>
      <p className="mt-3 max-w-prose text-[16px] text-muted">
        An account keeps your training history private and recoverable if this
        phone is lost or reset. One identity. No social feed.
      </p>
      {params.error ? (
        <p className="mt-4 rounded-[var(--radius)] border border-danger/40 bg-danger/10 px-3 py-2 text-[14px] text-ink">
          {params.error}
        </p>
      ) : null}
      <div className="mt-6">
        <LoginForm nextPath={params.next || "/today"} />
      </div>
    </div>
  );
}
