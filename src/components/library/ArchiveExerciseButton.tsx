"use client";

import { archiveExercise } from "@/app/actions/library";
import { Button } from "@/components/ui/Button";
import { useState } from "react";

export function ArchiveExerciseButton({ exerciseId }: { exerciseId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <Button
        variant="ghost"
        className="min-h-12 px-3 text-[14px] text-muted"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          const result = await archiveExercise(exerciseId);
          setBusy(false);
          if (!result.ok) {
            setError(result.error);
          }
        }}
      >
        Archive
      </Button>
      {error ? (
        <p className="text-[12px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
