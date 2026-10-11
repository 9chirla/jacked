"use client";

import { DeleteSessionButton } from "@/components/history/DeleteSessionButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { NumericKeypad } from "@/components/ui/NumericKeypad";
import { RestTimer } from "@/components/ui/RestTimer";
import { workingReps, workingSetCount, workingVolume } from "@/lib/calculations/volume";
import { queueAndSync } from "@/lib/offline/mutate";
import { useSyncStatus } from "@/components/pwa/SyncProvider";
import {
  clearSessionDraft,
  loadSessionDraft,
  saveSessionDraft,
  type DraftSet,
} from "@/lib/offline/workout-draft";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";

type ActionResult =
  | { ok: true; id?: string; data?: unknown }
  | {
      ok: false;
      error: string;
      conflict?: { entity: string; server: unknown; local: unknown };
    };

export type LoggerExercise = {
  id: string;
  name: string;
  category: string;
  targetNote: string | null;
  previousSummary: string | null;
  sets: DraftSet[];
};

type Field = "load" | "reps";

type Props = {
  sessionId: string;
  title: string;
  status: string;
  startedAt: string | null;
  initialExercises: LoggerExercise[];
  initialTotals: {
    volume: number;
    reps: number;
    workingSets: number;
  };
  upsertSetAction: (input: unknown) => Promise<ActionResult>;
  addSetAction: (
    sessionExerciseId: string,
    copyFromLast?: boolean,
  ) => Promise<ActionResult>;
  deleteSetAction: (setId: string) => Promise<ActionResult>;
  finishSessionAction: (input: unknown) => Promise<ActionResult>;
};

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WorkoutLogger({
  sessionId,
  title,
  status,
  startedAt,
  initialExercises,
  initialTotals,
  upsertSetAction,
  addSetAction,
  deleteSetAction,
  finishSessionAction,
}: Props) {
  const router = useRouter();
  const { online, refreshPending } = useSyncStatus();
  const [exercises, setExercises] = useState(initialExercises);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  const [restSeconds, setRestSeconds] = useState(90);
  const [restRunning, setRestRunning] = useState(false);
  /** Client-only clock — never seed with Date.now() during SSR (Flight crash). */
  const [now, setNow] = useState<number | null>(null);
  const [editor, setEditor] = useState<{
    exerciseId: string;
    setId: string;
    field: Field;
    value: string;
  } | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [rpe, setRpe] = useState("");
  const [note, setNote] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!editor && !finishOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditor(null);
        setFinishOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, finishOpen]);

  useEffect(() => {
    if (!restRunning) return;
    const id = window.setInterval(() => {
      setRestSeconds((s) => {
        if (s <= 1) {
          setRestRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [restRunning]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const draft = await loadSessionDraft(sessionId);
      if (!cancelled && draft?.sets?.length) {
        const draftNewer =
          draft.sets.some((s) => s.dirty) ||
          (draft.updatedAt &&
            draft.sets.some((s) => !s.id || s.id.startsWith("tmp-")));
        if (draftNewer) {
          setExercises((current) =>
            current.map((exercise) => {
              const draftSets = draft.sets
                .filter((s) => s.session_exercise_id === exercise.id)
                .sort((a, b) => a.set_number - b.set_number);
              return draftSets.length
                ? { ...exercise, sets: draftSets }
                : exercise;
            }),
          );
        }
        if (draft.restEndsAt && draft.restEndsAt > Date.now()) {
          setRestSeconds(Math.ceil((draft.restEndsAt - Date.now()) / 1000));
          setRestRunning(true);
        }
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!hydrated) return;
    const sets = exercises.flatMap((e) => e.sets);
    void saveSessionDraft({
      sessionId,
      updatedAt: new Date().toISOString(),
      restEndsAt: restRunning ? Date.now() + restSeconds * 1000 : null,
      activeExerciseId: editor?.exerciseId ?? null,
      sets,
    });
  }, [exercises, sessionId, restRunning, restSeconds, editor, hydrated]);

  const flatSets = useMemo(
    () => exercises.flatMap((e) => e.sets),
    [exercises],
  );
  const liveVolume = workingVolume(
    flatSets.map((s) => ({
      kind: s.kind,
      load: s.load,
      reps: s.reps,
    })),
  );
  const liveReps = workingReps(
    flatSets.map((s) => ({ kind: s.kind, load: s.load, reps: s.reps })),
  );
  const liveWorking = workingSetCount(
    flatSets.map((s) => ({
      kind: s.kind,
      load: s.load,
      reps: s.reps,
      completed: Boolean(s.completed_at),
    })),
  );

  const elapsed =
    startedAt && now != null ? now - new Date(startedAt).getTime() : 0;

  function updateLocalSet(
    exerciseId: string,
    setId: string,
    patch: Partial<DraftSet>,
  ) {
    setExercises((current) =>
      current.map((exercise) =>
        exercise.id !== exerciseId
          ? exercise
          : {
              ...exercise,
              sets: exercise.sets.map((set) =>
                set.id === setId ? { ...set, ...patch, dirty: true } : set,
              ),
            },
      ),
    );
  }

  function openEditor(exerciseId: string, set: DraftSet, field: Field) {
    setEditor({
      exerciseId,
      setId: set.id,
      field,
      value: String(field === "load" ? (set.load ?? "") : (set.reps ?? "")),
    });
  }

  function applyEditorValue(next: string) {
    if (!editor) return;
    setEditor({ ...editor, value: next });
    const num = next === "" || next === "." ? null : Number(next);
    updateLocalSet(editor.exerciseId, editor.setId, {
      [editor.field]: Number.isFinite(num as number) ? num : null,
    });
  }

  function persistSet(exerciseId: string, set: DraftSet, completed: boolean) {
    setError(null);
    setSyncNote(null);
    const payload = {
      id: set.id.startsWith("tmp-") ? undefined : set.id,
      session_exercise_id: set.session_exercise_id,
      set_number: set.set_number,
      kind: set.kind,
      load: set.load,
      reps: set.reps,
      note: set.note,
      completed,
      source: "manual" as const,
    };
    updateLocalSet(exerciseId, set.id, {
      completed_at: completed
        ? set.completed_at ?? new Date().toISOString()
        : null,
      dirty: true,
      pendingSync: true,
    });
    startTransition(async () => {
      const result = await queueAndSync({
        entity: "exercise_set",
        op: "upsert",
        payload,
        clientKey: `set:${set.session_exercise_id}:${set.set_number}`,
        execute: () => upsertSetAction(payload),
      });
      await refreshPending();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.queued && !result.data) {
        setSyncNote(
          online
            ? "Saved — syncing…"
            : "Saved on device — will sync when online.",
        );
        if (completed) {
          setRestSeconds(90);
          setRestRunning(true);
        }
        return;
      }
      const saved = result.data as DraftSet;
      setExercises((current) =>
        current.map((exercise) =>
          exercise.id !== exerciseId
            ? exercise
            : {
                ...exercise,
                sets: exercise.sets.map((row) =>
                  row.id === set.id || row.set_number === saved.set_number
                    ? {
                        ...row,
                        ...saved,
                        id: saved.id,
                        dirty: false,
                        pendingSync: false,
                      }
                    : row,
                ),
              },
        ),
      );
      if (completed) {
        setRestSeconds(90);
        setRestRunning(true);
      }
    });
  }

  const isCompleted = status === "completed";

  return (
    <div className="space-y-4 pb-8">
      <header className="sticky top-[57px] z-20 -mx-4 border-b border-line bg-bg/95 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="tabular text-[20px] font-medium text-ink">
              {formatElapsed(elapsed)}
            </p>
            <p className="tabular text-[14px] text-muted">
              {liveWorking || initialTotals.workingSets} sets · {liveReps} reps ·{" "}
              {liveVolume || initialTotals.volume} kg
            </p>
          </div>
          {!isCompleted ? (
            <Button onClick={() => setFinishOpen(true)} disabled={pending}>
              Finish
            </Button>
          ) : (
            <span className="text-[14px] text-muted">Completed</span>
          )}
        </div>
      </header>

      <section className="space-y-3">
        <h1 className="font-display text-[34px] font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <DeleteSessionButton
          sessionId={sessionId}
          status={status}
          variant="ghost"
          redirectTo={isCompleted ? "/history" : "/today"}
        />
      </section>

      {restRunning || restSeconds > 0 ? (
        <RestTimer
          seconds={restSeconds}
          running={restRunning}
          onSkip={() => {
            setRestRunning(false);
            setRestSeconds(0);
          }}
          onAdjust={(delta) =>
            setRestSeconds((s) => Math.max(0, s + delta))
          }
        />
      ) : null}

      {exercises.map((exercise) => (
        <Card key={exercise.id} className="space-y-3">
          <div>
            <h2 className="font-display text-[20px] font-semibold text-ink">
              {exercise.name}
            </h2>
            <p className="text-[14px] text-muted">
              {exercise.previousSummary
                ? `Previous: ${exercise.previousSummary}`
                : "No previous working sets — enter a starting load"}
            </p>
            {exercise.targetNote ? (
              <p className="text-[14px] text-muted">Target: {exercise.targetNote}</p>
            ) : null}
          </div>

          <ul className="space-y-2">
            {exercise.sets.map((set) => (
              <li
                key={set.id}
                className="grid grid-cols-[2rem_4.5rem_1fr_1fr_3rem] items-center gap-2"
              >
                <span className="tabular text-[14px] text-muted">
                  {set.set_number}
                </span>
                <Chip
                  selected={set.kind === "warmup"}
                  className="min-h-10 px-2 text-[12px]"
                  disabled={isCompleted || pending}
                  onClick={() => {
                    const kind = set.kind === "warmup" ? "working" : "warmup";
                    updateLocalSet(exercise.id, set.id, { kind });
                    persistSet(exercise.id, { ...set, kind }, Boolean(set.completed_at));
                  }}
                >
                  {set.kind === "warmup" ? "WU" : "Work"}
                </Chip>
                <button
                  type="button"
                  className="tabular min-h-12 rounded-[var(--radius-sm)] border border-line bg-bg px-2 text-left text-[16px]"
                  disabled={isCompleted}
                  onClick={() => openEditor(exercise.id, set, "load")}
                >
                  {set.load ?? "—"}
                </button>
                <button
                  type="button"
                  className="tabular min-h-12 rounded-[var(--radius-sm)] border border-line bg-bg px-2 text-left text-[16px]"
                  disabled={isCompleted}
                  onClick={() => openEditor(exercise.id, set, "reps")}
                >
                  {set.reps ?? "—"}
                </button>
                <button
                  type="button"
                  aria-label={set.completed_at ? "Completed" : "Mark complete"}
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-full border text-[12px] ${
                    set.completed_at
                      ? "border-accent-ink/20 bg-accent text-accent-ink"
                      : "border-line text-muted"
                  }`}
                  disabled={isCompleted || pending}
                  onClick={() =>
                    persistSet(exercise.id, set, !set.completed_at)
                  }
                >
                  {set.completed_at ? "OK" : ""}
                </button>
              </li>
            ))}
          </ul>

          {!isCompleted ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await addSetAction(exercise.id, true);
                    if (!result.ok) {
                      setError(result.error);
                      return;
                    }
                    const saved = result.data as DraftSet | undefined;
                    if (saved) {
                      setExercises((current) =>
                        current.map((ex) =>
                          ex.id !== exercise.id
                            ? ex
                            : {
                                ...ex,
                                sets: [
                                  ...ex.sets,
                                  {
                                    id: saved.id,
                                    session_exercise_id:
                                      saved.session_exercise_id ?? exercise.id,
                                    set_number: saved.set_number,
                                    kind: saved.kind,
                                    load:
                                      saved.load == null
                                        ? null
                                        : Number(saved.load),
                                    reps: saved.reps,
                                    completed_at: saved.completed_at,
                                    note: saved.note,
                                  },
                                ],
                              },
                        ),
                      );
                    }
                  });
                }}
              >
                + Add set
              </Button>
              {exercise.sets.length > 0 ? (
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    const last = exercise.sets[exercise.sets.length - 1];
                    if (!last || last.id.startsWith("tmp-")) return;
                    if (!window.confirm(`Delete set ${last.set_number}?`)) return;
                    startTransition(async () => {
                      const result = await deleteSetAction(last.id);
                      if (!result.ok) {
                        setError(result.error);
                        return;
                      }
                      setExercises((current) =>
                        current.map((ex) =>
                          ex.id !== exercise.id
                            ? ex
                            : {
                                ...ex,
                                sets: ex.sets
                                  .filter((s) => s.id !== last.id)
                                  .map((s, i) => ({
                                    ...s,
                                    set_number: i + 1,
                                  })),
                              },
                        ),
                      );
                    });
                  }}
                >
                  Delete last
                </Button>
              ) : null}
            </div>
          ) : null}
        </Card>
      ))}

      {portalReady && editor
        ? createPortal(
            <div
              className="fixed inset-0 z-[60] flex items-end justify-center"
              role="dialog"
              aria-modal="true"
              aria-label={`Edit ${editor.field === "load" ? "load" : "reps"}`}
            >
              <button
                type="button"
                aria-label="Dismiss keypad"
                className="absolute inset-0 bg-[rgba(12,16,10,0.4)]"
                onClick={() => setEditor(null)}
              />
              <div className="relative z-10 w-full max-w-lg border-t border-line bg-surface p-4 pb-[calc(1rem+var(--safe-bottom))] shadow-xl">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[16px] text-ink">
                      Edit {editor.field === "load" ? "load (kg)" : "reps"}
                    </p>
                    <Button variant="ghost" onClick={() => setEditor(null)}>
                      Close
                    </Button>
                  </div>
                  <NumericKeypad
                    value={editor.value}
                    allowDecimal={editor.field === "load"}
                    onChange={applyEditorValue}
                    onDone={() => {
                      const exercise = exercises.find(
                        (e) => e.id === editor.exerciseId,
                      );
                      const set = exercise?.sets.find(
                        (s) => s.id === editor.setId,
                      );
                      if (exercise && set) {
                        persistSet(
                          exercise.id,
                          set,
                          Boolean(set.completed_at),
                        );
                      }
                      setEditor(null);
                    }}
                  />
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {portalReady && finishOpen
        ? createPortal(
            <div className="fixed inset-0 z-[60] flex items-end justify-center bg-[rgba(12,16,10,0.45)] p-4">
              <Card className="w-full max-w-lg space-y-3">
                <h2 className="font-display text-[20px] font-semibold">
                  Finish workout
                </h2>
                <p className="text-[14px] text-muted">
                  Volume {liveVolume} kg · {liveWorking} working sets ·{" "}
                  {liveReps} reps
                </p>
                <label className="block space-y-1">
                  <span className="text-[14px] text-muted">
                    Session RPE (optional)
                  </span>
                  <input
                    inputMode="decimal"
                    value={rpe}
                    onChange={(e) => setRpe(e.target.value)}
                    className="min-h-12 w-full rounded-[var(--radius)] border border-line bg-bg px-3"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[14px] text-muted">Note</span>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-[var(--radius)] border border-line bg-bg px-3 py-3"
                  />
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setFinishOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        setError(null);
                        const payload = {
                          sessionId,
                          session_rpe: rpe ? Number(rpe) : null,
                          note: note || null,
                        };
                        const result = await queueAndSync({
                          entity: "workout_session",
                          op: "finish",
                          payload,
                          clientKey: `finish:${sessionId}`,
                          execute: () => finishSessionAction(payload),
                        });
                        await refreshPending();
                        if (!result.ok) {
                          setError(result.error);
                          return;
                        }
                        await clearSessionDraft(sessionId);
                        setFinishOpen(false);
                        if (result.queued && !online) {
                          setSyncNote(
                            "Workout finished on device — will sync when online.",
                          );
                          return;
                        }
                        router.push(`/log/${sessionId}/review`);
                      });
                    }}
                  >
                    Confirm
                  </Button>
                </div>
              </Card>
            </div>,
            document.body,
          )
        : null}

      {syncNote ? (
        <p className="text-[14px] text-muted" role="status">
          {syncNote}
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
