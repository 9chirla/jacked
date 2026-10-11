"use client";

import { deleteSession } from "@/app/actions/workout";
import { Button } from "@/components/ui/Button";
import { useSyncStatus } from "@/components/pwa/SyncProvider";
import { clearSessionDraft } from "@/lib/offline/workout-draft";
import { queueAndSync } from "@/lib/offline/mutate";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type Props = {
  sessionId: string;
  /** in_progress → discard wording; completed → delete logged workout */
  status?: string;
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  className?: string;
  /** Where to go after a successful delete. */
  redirectTo?: string;
};

export function DeleteSessionButton({
  sessionId,
  status = "completed",
  variant = "destructive",
  className,
  redirectTo = "/history",
}: Props) {
  const router = useRouter();
  const { online, refreshPending } = useSyncStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const label =
    status === "in_progress" ? "Discard session" : "Delete workout";
  const confirmMsg =
    status === "in_progress"
      ? "Discard this in-progress session? All sets will be removed."
      : "Delete this logged workout? Sets and volume for this session will be permanently removed.";

  return (
    <div className={className}>
      <Button
        variant={variant}
        disabled={pending}
        className="w-full sm:w-auto"
        onClick={() => {
          if (!window.confirm(confirmMsg)) return;
          setError(null);
          startTransition(async () => {
            const result = await queueAndSync({
              entity: "workout_session",
              op: "delete",
              payload: { id: sessionId },
              clientKey: `session-del:${sessionId}`,
              execute: () => deleteSession(sessionId),
            });
            await refreshPending();
            await clearSessionDraft(sessionId);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            if (result.queued && !online) {
              router.push(redirectTo);
              router.refresh();
              return;
            }
            router.push(redirectTo);
            router.refresh();
          });
        }}
      >
        {label}
      </Button>
      {error ? (
        <p className="mt-2 text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
