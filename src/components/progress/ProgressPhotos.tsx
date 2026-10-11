"use client";

import {
  deleteProgressPhoto,
  listProgressPhotos,
  registerProgressPhoto,
} from "@/app/actions/photos";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useTransition } from "react";

type PhotoRow = {
  id: string;
  taken_date: string;
  storage_path: string;
  note: string | null;
  signedUrl: string | null;
};

export function ProgressPhotos({
  enabled,
  defaultDate,
}: {
  enabled: boolean;
  defaultDate: string;
}) {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reload() {
    startTransition(async () => {
      const result = await listProgressPhotos();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPhotos((result.data as PhotoRow[]) ?? []);
      setError(null);
    });
  }

  useEffect(() => {
    if (enabled) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount load
  }, [enabled]);

  if (!enabled) {
    return (
      <p className="text-[14px] text-muted">
        Progress photos are off in your profile preferences.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[14px] text-muted">
        Private bucket only. Images stay behind signed URLs (1 hour).
      </p>
      <label className="block text-[14px] font-medium text-ink">
        Add photo
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          disabled={pending}
          className="mt-2 block w-full text-[14px] text-muted file:mr-3 file:min-h-12 file:rounded-[var(--radius)] file:border file:border-line file:bg-surface file:px-3 file:text-ink"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError(null);
            setMessage(null);
            startTransition(async () => {
              try {
                const supabase = createClient();
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) {
                  setError("Sign in required.");
                  return;
                }
                const ext =
                  file.type === "image/png"
                    ? "png"
                    : file.type === "image/webp"
                      ? "webp"
                      : "jpg";
                const path = `${user.id}/${defaultDate}-${crypto.randomUUID()}.${ext}`;
                const { error: upErr } = await supabase.storage
                  .from("progress-photos")
                  .upload(path, file, {
                    contentType: file.type,
                    upsert: false,
                  });
                if (upErr) {
                  setError(upErr.message);
                  return;
                }
                const reg = await registerProgressPhoto({
                  storagePath: path,
                  takenDate: defaultDate,
                });
                if (!reg.ok) {
                  setError(reg.error);
                  return;
                }
                setMessage("Photo saved.");
                reload();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Upload failed.");
              }
            });
          }}
        />
      </label>

      {photos.length === 0 ? (
        <p className="text-[14px] text-muted">No photos yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {photos.map((p) => (
            <li key={p.id} className="space-y-2">
              {p.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.signedUrl}
                  alt={`Progress photo ${p.taken_date}`}
                  width={320}
                  height={320}
                  className="aspect-square w-full rounded-[var(--radius)] border border-line object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-[var(--radius)] border border-line text-[13px] text-muted">
                  Unavailable
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="tabular text-[13px] text-muted">
                  {p.taken_date}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-10 px-2 text-[13px] text-danger"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteProgressPhoto(p.id);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      reload();
                    })
                  }
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {message ? (
        <p className="text-[14px] text-ink" role="status" aria-live="polite">
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
