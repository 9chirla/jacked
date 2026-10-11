"use client";

import {
  deleteAccountAndData,
  getOwnedRowCounts,
  importJackedJson,
} from "@/app/actions/data-ownership";
import { useSyncStatus } from "@/components/pwa/SyncProvider";
import { Button } from "@/components/ui/Button";
import { EXPORT_SCHEMA_VERSION } from "@/lib/data/schema-version";
import { clearOutbox } from "@/lib/offline/outbox";
import { clearAllSessionDrafts } from "@/lib/offline/workout-draft";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Counts = Record<string, number>;

export function DataOwnership() {
  const router = useRouter();
  const { online } = useSyncStatus();
  const [pending, startTransition] = useTransition();
  const [counts, setCounts] = useState<Counts | null>(null);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    startTransition(async () => {
      const result = await getOwnedRowCounts();
      if (result.ok) {
        setCounts(result.counts);
        setTotal(result.total);
      } else {
        setError(result.error);
      }
    });
  }, []);

  function download(path: string) {
    setError(null);
    setMessage(null);
    if (!online) {
      setError("Export unavailable offline — needs database access.");
      return;
    }
    window.location.assign(path);
    setMessage("Export started — check your downloads.");
    // Refresh counts after log insert settles
    window.setTimeout(() => {
      startTransition(async () => {
        const result = await getOwnedRowCounts();
        if (result.ok) {
          setCounts(result.counts);
          setTotal(result.total);
        }
      });
    }, 800);
  }

  function onImportFile(file: File | null) {
    if (!file) return;
    setError(null);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      startTransition(async () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          const result = await importJackedJson(parsed);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          const n = Object.values(result.imported).reduce((a, v) => a + v, 0);
          setMessage(`Imported ${n} rows (schema ${EXPORT_SCHEMA_VERSION}).`);
          const countsResult = await getOwnedRowCounts();
          if (countsResult.ok) {
            setCounts(countsResult.counts);
            setTotal(countsResult.total);
          }
        } catch {
          setError("Could not parse JSON file.");
        }
      });
    };
    reader.readAsText(file);
  }

  function onDelete() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      try {
        await clearAllSessionDrafts();
        await clearOutbox();
      } catch {
        // local clear is best-effort
      }
      const result = await deleteAccountAndData(confirm);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/login");
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-[14px] text-muted">
        Your training data is yours. Export JSON for full restore, or CSV (zip)
        for spreadsheets. Schema{" "}
        <span className="tabular text-ink">{EXPORT_SCHEMA_VERSION}</span>.
      </p>

      {counts ? (
        <p className="text-[14px] text-ink">
          <span className="tabular font-medium">{total}</span> owned rows across{" "}
          {Object.keys(counts).length} tables.
        </p>
      ) : null}

      {!online ? (
        <p className="text-[14px] text-muted" role="status">
          Export unavailable offline.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="primary"
          disabled={pending || !online}
          onClick={() => download("/api/export/json")}
        >
          Export JSON
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending || !online}
          onClick={() => download("/api/export/csv")}
        >
          Export CSV zip
        </Button>
      </div>

      <div className="space-y-2">
        <label className="block text-[14px] font-medium text-ink">
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            className="mt-2 block w-full text-[14px] text-muted file:mr-3 file:min-h-12 file:rounded-[var(--radius)] file:border file:border-line file:bg-surface file:px-3 file:text-ink"
            disabled={pending}
            onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <p className="text-[13px] text-muted">
          Rejects unknown schema versions. Upserts by id into this account.
        </p>
      </div>

      <div className="border-t border-line pt-4">
        {!showDelete ? (
          <Button
            type="button"
            variant="ghost"
            className="text-danger"
            onClick={() => setShowDelete(true)}
          >
            Delete account & data…
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-[14px] text-ink">
              Permanently deletes your auth account and all cascaded rows
              {total > 0 ? (
                <>
                  {" "}
                  (~<span className="tabular">{total}</span> rows)
                </>
              ) : null}
              . Export first if you need a copy. Type{" "}
              <span className="tabular font-medium">DELETE</span> to confirm.
            </p>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-[16px] text-ink"
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={pending || confirm !== "DELETE"}
                onClick={onDelete}
              >
                Delete forever
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setShowDelete(false);
                  setConfirm("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {message ? (
        <p className="text-[14px] text-ink" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-[14px] text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
