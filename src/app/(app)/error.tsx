"use client";

/**
 * App-shell error boundary. Do not read error.stack / message on the proxy —
 * Next 16 Flight overlays throw TypeError: Cannot read properties of undefined
 * (reading 'stack') when those fields are missing.
 */
export default function AppError({
  retry,
  reset,
}: {
  error?: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  const recover = retry ?? reset;

  return (
    <div className="mx-auto flex min-h-[50dvh] max-w-lg flex-col justify-center px-4 py-10">
      <h1 className="font-display text-[28px] font-semibold text-ink">
        Something broke
      </h1>
      <p className="mt-2 text-[16px] text-muted">
        Reload this screen, or go back to Today.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {recover ? (
          <button
            type="button"
            onClick={() => recover()}
            className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-accent px-4 font-medium text-accent-ink"
          >
            Retry
          </button>
        ) : null}
        <a
          href="/today"
          className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] border border-line bg-surface px-4 font-medium text-ink"
        >
          Go to Today
        </a>
      </div>
    </div>
  );
}
