import { getFeaturedSong, getProfile, listPublicSongs } from "@/lib/data";
import { fill, isLocale, t, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { Avatar, Cover } from "@/components/Cover";
import { PlayControl } from "@/components/PlayControl";
import { SongRow } from "@/components/SongRow";
import { ShareSheet } from "@/components/ShareSheet";
import { LangToggle } from "@/components/LangToggle";
import { NoteIcon, ShuffleIcon, SortIcon } from "@/components/Icons";
import { duration, monthYear } from "@/lib/format";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const dict = t(locale);

  const [profile, songs, featured] = await Promise.all([
    getProfile(),
    listPublicSongs(),
    getFeaturedSong(),
  ]);

  const rest = songs.filter((s) => s.slug !== featured?.slug);

  return (
    <main className="page">
      <div className="wrap">
        <header className="topbar">
          <span className="brand tracked">revyloml</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LangToggle locale={locale} path="" />
            <ShareSheet dict={dict} title={profile.name[locale]} label={dict.share} />
          </div>
        </header>

        <section className="profile">
          <Avatar size={72} name={profile.name[locale]} url={profile.photoUrl} />
          <div className="profile__col" style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 3 }}>
            <h1 className="profile__name">{profile.name[locale]}</h1>
            <span className="profile__sub">
              <span className="ltr">@{profile.handle}</span>
              {" · "}
              <span>{fill(dict.nSongs, { n: songs.length })}</span>
            </span>
            {profile.bio[locale] && <p className="profile__bio">{profile.bio[locale]}</p>}
            <div className="profile__actions" style={{ marginBlockStart: 8 }}>
              <ShareSheet
                dict={dict}
                title={profile.name[locale]}
                label={dict.sharePage}
                text={dict.sharePage}
                buttonClass="btn btn--primary"
              />
              <button type="button" className="btn btn--secondary">
                <ShuffleIcon size={16} /> {dict.shuffle}
              </button>
            </div>
          </div>
        </section>

        {songs.length === 0 ? (
          <div className="state">
            <span className="state__icon"><NoteIcon /></span>
            <h2 className="state__title">{dict.emptyTitle}</h2>
            <p className="state__body">{dict.emptyBody}</p>
          </div>
        ) : (
          <>
            {featured && (
              <section className="card" style={{ marginBlockEnd: 18 }}>
                <div className="featured__head">
                  <span className="chip chip--accent">{dict.pinned}</span>
                  <span className="row__dur num">{duration(featured.duration)}</span>
                </div>
                <div className="featured">
                  <Cover size={84} title={featured.title[locale]} slug={featured.slug} url={featured.coverUrl} />
                  <a href={`/${locale}/s/${featured.slug}`} style={{ flexGrow: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span className="featured__title">{featured.title[locale]}</span>
                      <span className="row__meta">{monthYear(featured.releasedAt, locale)}</span>
                    </span>
                  </a>
                  <PlayControl song={featured} dict={dict} title={featured.title[locale]} glyph={20} />
                </div>
              </section>
            )}

            <div className="section-head">
              <h2 className="section-title eyebrow">{dict.songs}</h2>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--t3)" }}>
                <SortIcon /> {dict.newest}
              </span>
            </div>
            <ul>
              {rest.map((song) => (
                <SongRow key={song.slug} song={song} locale={locale} dict={dict} />
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
