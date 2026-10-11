"use client";

/**
 * Minimal route error UI. Never read error.stack / error.message — Next 16
 * Flight error proxies can be incomplete and the overlay then throws
 * `Cannot read properties of undefined (reading 'stack')`.
 */
export default function Error({
  retry,
  reset,
}: {
  error?: unknown;
  retry?: () => void;
  reset?: () => void;
}) {
  const recover = retry ?? reset;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
      <h1 className="font-display text-[34px] font-semibold text-ink">
        Something broke
      </h1>
      <p className="mt-2 text-[16px] text-muted">
        Your in-progress entries stay on this device when offline storage is
        active. Reload the page, or go back to Today.
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
