import { ImageResponse } from "next/og";
import { getProfile } from "@/lib/data";
import { coverLetter } from "@/lib/format";
import { OG, OG_CONTENT_TYPE, OG_SIZE, ogFonts } from "@/lib/og";

export const alt = "Profile";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const revalidate = 3600;

/**
 * The card shown when the page itself is shared.
 *
 * No Arabic text, for the reason documented on the song image: the renderer has
 * no Arabic shaping and would reverse it. The name arrives in og:title, which
 * the sharing app lays out itself.
 */
export default async function Image() {
  const [profile, { regular, semibold }] = await Promise.all([getProfile(), ogFonts()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 36,
          background: OG.bg,
          fontFamily: "Plex",
        }}
      >
        {profile.photoUrl ? (
          <img
            src={profile.photoUrl}
            width={260}
            height={260}
            style={{ borderRadius: 260, objectFit: "cover" }}
            alt=""
          />
        ) : (
          <div
            style={{
              width: 260,
              height: 260,
              borderRadius: 260,
              background: profile.accent,
              color: "#06130B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 120,
              fontWeight: 600,
            }}
          >
            {coverLetter(profile.name.en || profile.handle)}
          </div>
        )}
        <div style={{ display: "flex", fontSize: 44, color: OG.muted }}>
          {`@${profile.handle}`}
        </div>
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
