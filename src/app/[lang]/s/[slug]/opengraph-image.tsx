import { ImageResponse } from "next/og";
import { getProfile, getSong } from "@/lib/data";
import { isLocale, type Locale } from "@/lib/i18n";
import { coverLetter, coverTint } from "@/lib/format";
import { OG, OG_CONTENT_TYPE, OG_SIZE, ogFonts } from "@/lib/og";

export const alt = "Cover art";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

// Rendering a PNG is the most expensive thing this app does and a crawler may
// hit it several times. An hour of caching makes repeat scrapes free.
export const revalidate = 3600;

/**
 * The picture in the card WhatsApp and Instagram show for a shared song.
 *
 * It carries artwork and nothing written in Arabic, deliberately. The image
 * renderer behind next/og has no bidi or Arabic shaping: it lays glyphs out
 * left to right, so an Arabic title comes back with its letters reversed. Every
 * platform that scrapes this renders og:title and og:description itself, with
 * proper text layout, right beside this image — so the title still shows up in
 * the preview, correctly, without being baked into a PNG.
 *
 * A single letter has no ordering to get wrong, so the generated fallback tile
 * is safe. The handle is safe too: it is constrained to Latin characters.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const [song, profile, { regular, semibold }] = await Promise.all([
    getSong(slug),
    getProfile(),
    ogFonts(),
  ]);

  const title = song ? song.title[locale] : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: OG.bg,
          fontFamily: "Plex",
          position: "relative",
        }}
      >
        {song?.coverUrl ? (
          <img
            src={song.coverUrl}
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{ objectFit: "cover" }}
            alt=""
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: song ? coverTint(song.slug) : OG.surface,
              fontSize: 340,
              fontWeight: 600,
              color: "rgba(255,255,255,0.13)",
            }}
          >
            {coverLetter(title || profile.handle)}
          </div>
        )}

        {/* One accent line and the handle: the only marks on the artwork. */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 10,
            background: profile.accent,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 48,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 22px",
            borderRadius: 10,
            background: "rgba(10,10,10,0.72)",
            fontSize: 30,
            color: OG.text,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: 12, background: profile.accent }} />
          {`@${profile.handle}`}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Plex", data: regular, weight: 400, style: "normal" },
        { name: "Plex", data: semibold, weight: 600, style: "normal" },
      ],
    },
  );
}
