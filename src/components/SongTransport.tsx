"use client";

import { usePlayer } from "@/player/PlayerProvider";
import { PlayControl } from "./PlayControl";
import { SeekBar } from "./SeekBar";
import { NextIcon, PrevIcon, ShuffleIcon } from "./Icons";
import type { Dict } from "@/lib/i18n";
import type { Song } from "@/lib/types";

/** The full player on a song page. Drives the same audio as the mini player. */
export function SongTransport({ song, dict, title }: { song: Song; dict: Dict; title: string }) {
  const { next, prev, shuffled, toggleShuffle } = usePlayer();

  return (
    <>
      <SeekBar large label={dict.play} song={song} />
      <div className="transport">
        <button
          type="button"
          className={`iconbtn${shuffled ? " iconbtn--on" : " iconbtn--quiet"}`}
          onClick={toggleShuffle}
          aria-pressed={shuffled}
          aria-label={dict.shuffle}
        >
          <ShuffleIcon size={19} />
        </button>
        <button type="button" className="iconbtn iconbtn--strong" onClick={prev} aria-label={dict.prev}>
          <PrevIcon size={25} className="flip" />
        </button>
        <PlayControl song={song} dict={dict} title={title} variant="lg" glyph={25} />
        <button type="button" className="iconbtn iconbtn--strong" onClick={next} aria-label={dict.next}>
          <NextIcon size={25} className="flip" />
        </button>
      </div>
      {!song.audioUrl && <p className="note">{dict.noAudio}</p>}
    </>
  );
}
