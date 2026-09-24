import { coverLetter, coverTint } from "@/lib/format";

/**
 * A song cover. With no uploaded artwork it falls back to the generated tile:
 * a tint derived from the slug plus the title's first character. Deterministic,
 * so the same song always looks the same, in Arabic or Latin.
 */
export function Cover({
  size, title, slug, url, radius,
}: {
  size: number;
  title: string;
  slug: string;
  url?: string | null;
  radius?: number;
}) {
  const style: React.CSSProperties = {
    inlineSize: size,
    blockSize: size,
    background: url ? undefined : coverTint(slug),
    borderRadius: radius,
  };
  return (
    <div className="cover" style={style}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" />
      ) : (
        <span className="cover__letter" style={{ fontSize: Math.round(size * 0.4) }}>
          {coverLetter(title)}
        </span>
      )}
    </div>
  );
}

export function Avatar({ size, name, url }: { size: number; name: string; url?: string | null }) {
  return (
    <div
      className="avatar"
      role="img"
      aria-label={name}
      style={{ inlineSize: size, blockSize: size, fontSize: Math.round(size * 0.4) }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" /> : <span aria-hidden>{coverLetter(name)}</span>}
    </div>
  );
}
