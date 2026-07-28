"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#0d1117",
          color: "#e8eef4",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(232,238,244,0.45)",
            }}
          >
            CEO.ai
          </p>

          <h1 style={{ margin: "0.75rem 0 0", fontSize: "1.35rem", fontWeight: 600 }}>
            The application failed to start
          </h1>

          <p
            style={{
              margin: "0.75rem 0 0",
              fontSize: "0.9rem",
              lineHeight: 1.75,
              color: "rgba(232,238,244,0.6)",
            }}
          >
            This is a fault in the app shell rather than anything you did. Reloading usually
            clears it.
          </p>

          {error.digest ? (
            <p
              style={{
                margin: "1.25rem 0 0",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.4rem",
                background: "rgba(232,238,244,0.06)",
                fontFamily: "monospace",
                fontSize: "0.72rem",
                color: "rgba(232,238,244,0.55)",
              }}
            >
              {error.digest}
            </p>
          ) : null}

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.7rem 1.4rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#e8eef4",
              color: "#0d1117",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
