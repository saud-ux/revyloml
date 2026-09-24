"use client";

import { usePlayer } from "@/player/PlayerProvider";
import { duration } from "@/lib/format";
import type { Song } from "@/lib/types";

/**
 * Square-ended progress, no knob — you scrub the bar itself. It fills from the
 * start edge, so it runs right-to-left in Arabic with no extra code.
 */
export function SeekBar({
  large = false, label, song,
}: {
  large?: boolean;
  label: string;
  /** the song this bar belongs to; its stored length is shown until it plays */
  song?: Song;
}) {
  const { current, time, length, playable, seekTo } = usePlayer();
  const isCurrent = !song || current?.slug === song.slug;
  const shownTime = isCurrent ? time : 0;
  const shownLength = isCurrent && length > 0 ? length : (song?.duration ?? length);
  const pct = shownLength > 0 ? Math.min(100, (shownTime / shownLength) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <input
        type="range"
        className="sr-only"
        aria-label={label}
        min={0}
        max={Math.max(1, Math.round(shownLength))}
        value={Math.round(shownTime)}
        disabled={!isCurrent || !playable}
        onChange={(e) => seekTo(Number(e.target.value))}
      />
      <div className={`seek${large ? " seek--lg" : ""}`} aria-hidden>
        <span className="seek__fill" style={{ inlineSize: `${pct}%` }} />
      </div>
      <div className="times num" aria-hidden>
        <span>{duration(shownTime)}</span>
        <span>{duration(shownLength)}</span>
      </div>
    </div>
  );
}
