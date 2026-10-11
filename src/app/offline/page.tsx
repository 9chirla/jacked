
export const metadata = {
  title: "Offline",
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
      <p className="font-display text-[26px] font-semibold text-ink">Jacked</p>
      <h1 className="font-display mt-3 text-[34px] font-semibold tracking-tight text-ink">
        You are offline
      </h1>
      <p className="mt-3 text-[16px] text-muted">
        Cached shell and drafts stay available. Set logging, finish workout, and
        weigh-ins queue to the outbox and sync when you are back online. Export,
        full history search, and sign-in are unavailable offline.
      </p>
      <p className="mt-2 text-[14px] text-muted">
        Full matrix: Settings → Offline & install.
      </p>
      <a
        href="/today"
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-[var(--radius)] bg-accent px-4 font-medium text-accent-ink"
      >
        Try Today again
      </a>
    </div>
  );
}
