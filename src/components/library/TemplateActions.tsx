"use client";

import { Button } from "@/components/ui/Button";
import { useState, useTransition } from "react";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

type Props = {
  templateId: string;
  /** Bound from the Server Component so action IDs match the current RSC payload. */
  startAction: (templateId: string) => Promise<ActionResult | void>;
  duplicateAction: (templateId: string) => Promise<ActionResult>;
  deleteAction: (templateId: string) => Promise<ActionResult>;
};

export function TemplateActions({
  templateId,
  startAction,
  duplicateAction,
  deleteAction,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await startAction(templateId);
            if (result && !result.ok) setError(result.error);
          });
        }}
      >
        Start
      </Button>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await duplicateAction(templateId);
            if (!result.ok) setError(result.error);
          });
        }}
      >
        Duplicate
      </Button>
      <Button
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (!window.confirm("Delete this template? Logged sessions stay.")) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await deleteAction(templateId);
            if (!result.ok) setError(result.error);
          });
        }}
      >
        Delete
      </Button>
      {error ? (
        <p className="w-full text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
