"use client";

import { Button } from "@/components/ui/Button";
import { useState } from "react";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

export function CreateTemplateForm({
  createAction,
}: {
  createAction: (name: string) => Promise<ActionResult>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaving(true);
        setError(null);
        const result = await createAction(name);
        setSaving(false);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        setName("");
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        placeholder="New template name"
        className="min-h-12 flex-1 rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px]"
      />
      <Button type="submit" disabled={saving}>
        {saving ? "Creating…" : "Create"}
      </Button>
      {error ? (
        <p className="w-full text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
