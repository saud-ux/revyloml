"use client";

/**
 * The last resort, for a failure in the root layout itself. It replaces the
 * whole document, so it carries its own html and body and cannot rely on any
 * stylesheet having loaded.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0, minHeight: "100vh", display: "grid", placeItems: "center",
          background: "#0a0a0a", color: "#fff", textAlign: "center", padding: 24,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>صار خطأ</h1>
          <p style={{ color: "#a7a7a7", fontSize: 15, marginBottom: 20 }}>
            Something went wrong
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              background: "#1db954", color: "#06130b", border: 0, borderRadius: 8,
              padding: "12px 22px", fontSize: 15, fontWeight: 600, minHeight: 44,
            }}
          >
            حاول مرة ثانية
          </button>
        </div>
      </body>
    </html>
  );
}
