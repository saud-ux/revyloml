import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfile, getSong, listPublicSongs } from "@/lib/data";
import { fill, isLocale, t, type Locale } from "@/lib/i18n";
import { monthYear } from "@/lib/format";
import { Cover } from "@/components/Cover";
import { SongRow } from "@/components/SongRow";
import { SongTransport } from "@/components/SongTransport";
import { ShareSheet } from "@/components/ShareSheet";
import { LangToggle } from "@/components/LangToggle";
import { BackIcon } from "@/components/Icons";

type Params = Promise<{ lang: string; slug: string }>;

/**
 * Shared links land here, usually from WhatsApp on a phone, so the preview card
 * has to be right: title, artist and date rendered on the server.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const [song, profile] = await Promise.all([getSong(slug), getProfile()]);
  if (!song) return { title: t(locale).notFoundTitle };

  const title = song.title[locale];
  const description = `${profile.name[locale]} · ${monthYear(song.releasedAt, locale)}`;
  return {
    title,
    description,
    openGraph: { title, description, type: "music.song" },
    twitter: { card: "summary", title, description },
    // Hidden songs open by direct link but must never be indexed.
    robots: song.visibility === "hidden" ? { index: false, follow: false } : undefined,
  };
}

export default async function SongPage({ params }: { params: Params }) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const dict = t(locale);

  const [song, profile, songs] = await Promise.all([getSong(slug), getProfile(), listPublicSongs()]);
  if (!song) notFound();

  const more = songs.filter((s) => s.slug !== song.slug).slice(0, 4);
  const lyricLines = song.lyrics.split("\n").filter(Boolean);

  return (
    <main className="page glow">
      <div className="wrap">
        <header className="topbar">
          <Link href={`/${locale}`} className="iconbtn" aria-label={dict.back}>
            <BackIcon className="flip" />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LangToggle locale={locale} path={`/s/${song.slug}`} />
            <ShareSheet dict={dict} title={song.title[locale]} label={dict.share} />
          </div>
        </header>

        <div className="song-layout">
          <div>
            <div className="song-art">
              <Cover size={300} title={song.title[locale]} slug={song.slug} url={song.coverUrl} radius={10} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingBlockEnd: 16 }}>
              <h1 className="song-title">{song.title[locale]}</h1>
              <p className="song-meta">
                {profile.name[locale]} · {monthYear(song.releasedAt, locale)}
              </p>
            </div>
            <SongTransport song={song} dict={dict} title={song.title[locale]} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {lyricLines.length > 0 && (
              <details className="lyrics" open>
                <summary className="lyrics__head">
                  <span className="eyebrow">{dict.lyrics}</span>
                </summary>
                <div className="lyrics__body">
                  {lyricLines.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </details>
            )}

            {more.length > 0 && (
              <section>
                <div className="section-head">
                  <h2 className="section-title eyebrow">{fill(dict.moreBy, { name: profile.name[locale] })}</h2>
                </div>
                <ul>
                  {more.map((s) => (
                    <SongRow key={s.slug} song={s} locale={locale} dict={dict} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
