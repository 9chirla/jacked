"use client";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    const supabase = createClient();
    // Prefer configured public app URL so magic links never fall back to a
    // stale localhost Site URL when opened on another device.
    const configured = (process.env.NEXT_PUBLIC_APP_URL || "").replace(
      /\/$/,
      "",
    );
    const origin =
      configured && !configured.includes("localhost")
        ? configured
        : window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
        shouldCreateUser: true,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage(
      "Check your email for the magic link. Open it on this device to finish signing in.",
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-[14px] text-muted">Email</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px] text-ink"
          placeholder="you@example.com"
        />
      </label>
      <Button type="submit" className="w-full" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Email me a magic link"}
      </Button>
      {message ? (
        <p
          role="status"
          aria-live="polite"
          className="text-[14px] text-muted"
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
