/**
 * Skeletons mirror the real layout box for box so nothing jumps when data lands.
 *
 * Deliberately NOT wired as `loading.tsx` yet: that opens a Suspense boundary,
 * the shell streams with a 200, and a dead shared link would answer 200 instead
 * of 404. Content is local today so there is nothing to wait for. Wire this up
 * when the data moves behind the network, and move notFound() ahead of the
 * boundary at the same time.
 */
export function HomeSkeleton() {
  return (
    <main className="page" aria-busy="true">
      <div className="wrap" style={{ paddingBlockStart: 24, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 11 }}>
          <span className="skel" style={{ inlineSize: 72, blockSize: 72, borderRadius: "50%" }} />
          <span className="skel" style={{ inlineSize: 110, blockSize: 17 }} />
          <span className="skel" style={{ inlineSize: 160, blockSize: 11 }} />
        </div>
        <span className="skel" style={{ inlineSize: "100%", blockSize: 112, borderRadius: "var(--r-card)" }} />
        {[70, 64, 58, 52, 46].map((w) => (
          <div key={w} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px" }}>
            <span className="skel" style={{ inlineSize: 48, blockSize: 48, borderRadius: "var(--r-cover)" }} />
            <span style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="skel" style={{ inlineSize: `${w}%`, blockSize: 13 }} />
              <span className="skel" style={{ inlineSize: "34%", blockSize: 10 }} />
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
