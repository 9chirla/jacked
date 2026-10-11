"use client";

/**
 * Root error boundary. Never inspect error.stack — Flight proxies may be incomplete
 * and the overlay then throws secondary TypeErrors.
 */
export default function GlobalError({
  reset,
}: {
  error?: unknown;
  reset?: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif",
          background: "#F7F8F6",
          color: "#121612",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420 }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>Something broke</h1>
          <p style={{ marginTop: 12, color: "#5C655C", fontSize: 16 }}>
            Reload the page. Your queued offline writes stay on this device.
          </p>
          <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
            {reset ? (
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  minHeight: 48,
                  padding: "0 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "#C9F24D",
                  color: "#121612",
                  fontWeight: 600,
                  fontSize: 16,
                }}
              >
                Retry
              </button>
            ) : null}
            <a
              href="/today"
              style={{
                minHeight: 48,
                padding: "0 16px",
                borderRadius: 8,
                border: "1px solid #D5DBD5",
                background: "#fff",
                color: "#121612",
                fontWeight: 600,
                fontSize: 16,
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Go to Today
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
