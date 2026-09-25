"use client";

import Link from "next/link";
import { usePlayer } from "@/player/PlayerProvider";
import { Cover } from "./Cover";
import { PauseIcon, PlayIcon } from "./Icons";
import { duration } from "@/lib/format";
import type { Song } from "@/lib/types";
import type { Locale, Dict } from "@/lib/i18n";

/**
 * The row is a link to the song page; the play control inside it is a button
 * with its own label and its own tab stop. On the playing row the cover slot
 * becomes the control — the signature of this direction.
 */
export function SongRow({ song, locale, dict }: { song: Song; locale: Locale; dict: Dict }) {
  const { current, playing } = usePlayer();
  const active = current?.slug === song.slug && playing;

  return (
    <li>
      <div className={`row${active ? " row--active" : ""}`}>
        <RowCover song={song} dict={dict} locale={locale} active={active} />
        <Link href={`/${locale}/s/${song.slug}`} className="row__main">
          <span className="row__title">{song.title[locale]}</span>
        </Link>
        {active && (
          <span className="meter" aria-hidden>
            <span style={{ blockSize: 6 }} />
            <span style={{ blockSize: 13 }} />
            <span style={{ blockSize: 9 }} />
          </span>
        )}
        <span className="row__dur num">{duration(song.duration)}</span>
      </div>
    </li>
  );
}

/**
 * The cover doubles as the play control: plain artwork at rest, the play glyph
 * over it on hover or focus, and the accent fill while this song is playing.
 * Tapping the artwork plays; tapping the text opens the song page.
 */
function RowCover({
  song, dict, locale, active,
}: {
  song: Song;
  dict: Dict;
  locale: Locale;
  active: boolean;
}) {
  const { current, playing, playSong } = usePlayer();
  const isCurrent = current?.slug === song.slug;
  const disabled = !song.audioUrl;
  const title = song.title[locale];

  return (
    <button
      type="button"
      className={`row__lead${active ? " row__lead--on" : ""}`}
      aria-disabled={disabled || undefined}
      title={disabled ? dict.noAudio : undefined}
      aria-label={
        disabled ? `${title}. ${dict.noAudio}` : `${isCurrent && playing ? dict.pause : dict.play} ${title}`
      }
      onClick={() => !disabled && playSong(song)}
    >
      <Cover size={48} title={title} slug={song.slug} url={song.coverUrl} />
      <span className="row__lead-glyph" aria-hidden>
        {isCurrent && playing ? <PauseIcon size={20} /> : <PlayIcon size={20} />}
      </span>
    </button>
  );
}
