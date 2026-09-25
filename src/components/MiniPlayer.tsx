"use client";

import Link from "next/link";
import { usePlayer } from "@/player/PlayerProvider";
import { Cover } from "./Cover";
import { NextIcon, PauseIcon, PlayIcon } from "./Icons";
import type { Locale, Dict } from "@/lib/i18n";

/**
 * Sticky, opaque, with the progress line welded to its BOTTOM edge. Rendered by
 * the locale layout so it keeps playing while you browse.
 */
export function MiniPlayer({ locale, dict }: { locale: Locale; dict: Dict }) {
  const { current, playing, toggle, next, time, length, playable } = usePlayer();
  if (!current) return null;

  const pct = length > 0 ? Math.min(100, (time / length) * 100) : 0;

  return (
    <div className="mini">
      <Link href={`/${locale}/s/${current.slug}`} className="mini__main">
        <Cover size={40} title={current.title[locale]} slug={current.slug} url={current.coverUrl} radius={4} />
        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span className="mini__title">{current.title[locale]}</span>
          <span className="mini__sub">
            {!playable ? dict.noAudio : playing ? dict.nowPlaying : dict.paused}
          </span>
        </span>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          className="play play--sm"
          onClick={toggle}
          aria-disabled={!playable || undefined}
          aria-label={playing ? dict.pause : dict.play}
        >
          {playing ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
        </button>
        <button type="button" className="iconbtn" onClick={next} aria-label={dict.next}>
          <NextIcon size={20} className="flip" />
        </button>
      </div>
      <div className="mini__bar" aria-hidden>
        <span style={{ inlineSize: `${pct}%` }} />
      </div>
    </div>
  );
}
