import type { CoachClaim } from "@/lib/coach/types";

export function ClaimList({
  title,
  claims,
}: {
  title: string;
  claims: CoachClaim[];
}) {
  if (claims.length === 0) return null;
  return (
    <section className="space-y-2 rounded-[var(--radius)] border border-line bg-surface p-4">
      <h2 className="font-display text-[20px] font-semibold text-ink">
        {title}
      </h2>
      <ul className="space-y-3">
        {claims.map((c) => (
          <li key={c.id}>
            <p className="text-[16px] text-ink">{c.text}</p>
          </li>
        ))}
      </ul>
      <details className="pt-1">
        <summary className="cursor-pointer text-[13px] text-muted">
          Data sources
        </summary>
        <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted">
          {claims.map((c) => (
            <li key={`${c.id}-src`}>{c.source}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
