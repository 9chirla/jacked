import {
  getJackedDb,
  type DraftSet,
  type SessionDraft,
} from "@/lib/offline/db";

export type { DraftSet, SessionDraft };

export async function saveSessionDraft(draft: SessionDraft) {
  const db = await getJackedDb();
  await db.put("sessionDrafts", {
    ...draft,
    updatedAt: new Date().toISOString(),
  });
}

export async function loadSessionDraft(sessionId: string) {
  const db = await getJackedDb();
  return db.get("sessionDrafts", sessionId);
}

export async function clearSessionDraft(sessionId: string) {
  const db = await getJackedDb();
  await db.delete("sessionDrafts", sessionId);
}

export async function clearAllSessionDrafts() {
  const db = await getJackedDb();
  await db.clear("sessionDrafts");
}
