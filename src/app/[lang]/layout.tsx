import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import "../../styles/components.css";
import { DEFAULT_LOCALE, LOCALES, dir, isLocale, t, type Locale } from "@/lib/i18n";
import { getProfile, listPublicSongs } from "@/lib/data";
import { PlayerProvider } from "@/player/PlayerProvider";
import { MiniPlayer } from "@/components/MiniPlayer";
import { notFound } from "next/navigation";

/** One family carries both scripts, which is why the bilingual page does not
 *  look like two designs stitched together. Self-hosted by next/font. */
const plex = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex",
});

export const dynamicParams = false;

/**
 * Rendered per request rather than prerendered. Yazan edits his own content, so
 * a page cached at build time would show whatever the database held when the
 * deploy ran — or, if the build had no database, the JSON seed. Traffic here is
 * one artist's audience; a query per request costs nothing next to that bug.
 */
export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  const profile = await getProfile();

  // Link previews carry an absolute image URL, so the site's own address has to
  // be known on the server. Render provides RENDER_EXTERNAL_URL; SITE_URL is the
  // override for a custom domain.
  const base = process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL;

  return {
    metadataBase: base ? new URL(base) : undefined,
    title: { default: profile.name[locale], template: `%s · ${profile.name[locale]}` },
    description: profile.bio[locale] || undefined,
    openGraph: { siteName: profile.name[locale], type: "profile" },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;

  const [songs, profile] = await Promise.all([listPublicSongs(), getProfile()]);

  return (
    <html
      lang={locale}
      dir={dir(locale)}
      className={plex.variable}
      style={{ ["--accent" as string]: profile.accent }}
    >
      <body>
        {/* The provider (and its single <audio>) stays mounted across navigations
            inside this locale, which is what keeps playback alive. */}
        <PlayerProvider queue={songs} initial={null}>
          {children}
          <MiniPlayer locale={locale} dict={t(locale)} />
        </PlayerProvider>
      </body>
    </html>
  );
}
