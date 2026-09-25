import { getFeaturedSong, getProfile, listPublicSongs, type SongOrder } from "@/lib/data";
import { fill, isLocale, t, type Locale } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { Avatar, Cover } from "@/components/Cover";
import { SocialLinks } from "@/components/SocialLinks";
import { PlayControl } from "@/components/PlayControl";
import { SongRow } from "@/components/SongRow";
import { ShareSheet } from "@/components/ShareSheet";
import { LangToggle } from "@/components/LangToggle";
import { NoteIcon, SortIcon } from "@/components/Icons";
import { ShuffleButton } from "@/components/ShuffleButton";
import Link from "next/link";
import { duration, playCount } from "@/lib/format";

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const dict = t(locale);

  // The order Yazan dragged them into is the default, because it is the one he
  // controls. A visitor can flip to newest-first; the choice rides in the URL
  // so a shared link keeps it.
  const { sort } = await searchParams;
  const order: SongOrder = sort === "newest" ? "newest" : "custom";

  const [profile, songs, featured] = await Promise.all([
    getProfile(),
    listPublicSongs(order),
    getFeaturedSong(),
  ]);

  const rest = songs.filter((s) => s.slug !== featured?.slug);

  return (
    <main className="page glow">
      <div className="wrap">
        <header className="topbar">
          <span className="brand tracked">revyloml</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LangToggle locale={locale} path="" />
            <ShareSheet dict={dict} title={profile.name[locale]} label={dict.share} heading={dict.sharePage} />
          </div>
        </header>

        <section className="profile">
          <Avatar size={72} name={profile.name[locale]} url={profile.photoUrl} />
          <div className="profile__col" style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: 3 }}>
            <h1 className="profile__name">{profile.name[locale]}</h1>
            <span className="profile__sub">
              <span className="ltr">@{profile.handle}</span>
            </span>
            {profile.bio[locale] && <p className="profile__bio">{profile.bio[locale]}</p>}
            <SocialLinks social={profile.social} />
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
                  <span className="chip chip--accent">{dict.featured}</span>
                  <span className="row__dur num">{duration(featured.duration)}</span>
                </div>
                <div className="featured">
                  <Cover size={84} title={featured.title[locale]} slug={featured.slug} url={featured.coverUrl} />
                  <a href={`/${locale}/s/${featured.slug}`} style={{ flexGrow: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span className="featured__title">{featured.title[locale]}</span>
                      {featured.plays >= 5 && (
                        <span className="row__meta">{playCount(featured.plays, locale)}</span>
                      )}
                    </span>
                  </a>
                  <PlayControl song={featured} dict={dict} title={featured.title[locale]} glyph={20} />
                </div>
              </section>
            )}

            <div className="section-head">
              <h2 className="section-title eyebrow">{dict.songs}</h2>
              <Link
                href={order === "newest" ? `/${locale}` : `/${locale}?sort=newest`}
                className="sortlink"
                aria-label={
                  order === "newest"
                    ? fill(dict.sortToCustom, { name: profile.name[locale] })
                    : dict.sortToNewest
                }
              >
                <SortIcon />{" "}
                {order === "newest" ? dict.newest : fill(dict.ownOrder, { name: profile.name[locale] })}
              </Link>
            </div>
            <ul>
              {rest.map((song) => (
                <SongRow key={song.slug} song={song} locale={locale} dict={dict} />
              ))}
            </ul>
          </>
        )}

        {/* The two buttons used to sit under the name, where they pushed the
            first song down the screen. Down here they close the page instead:
            you reach them after the list, which is when sharing it or hearing
            it in a new order is the thing you actually want next. */}
        <footer className="pagefoot">
          {songs.length > 0 && <ShuffleButton dict={dict} />}
          <ShareSheet
            dict={dict}
            title={profile.name[locale]}
            label={dict.sharePage}
            text={dict.sharePage}
            heading={dict.sharePage}
            buttonClass="btn btn--primary"
          />
        </footer>
      </div>
    </main>
  );
}
