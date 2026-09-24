"use client";

import { usePlayer } from "@/player/PlayerProvider";
import { PauseIcon, PlayIcon } from "./Icons";
import type { Song } from "@/lib/types";
import type { Dict } from "@/lib/i18n";

/**
 * The one play control. Shows pause only for the song that is actually playing,
 * and goes disabled (with a reason) when a song has no audio file yet.
 */
export function PlayControl({
  song, dict, title, variant = "md", glyph = 20,
}: {
  song: Song;
  dict: Dict;
  /** the song's title in the reader's language, for the control's label */
  title: string;
  variant?: "sm" | "md" | "lg" | "cover";
  glyph?: number;
}) {
  const { current, playing, playSong } = usePlayer();
  const isCurrent = current?.slug === song.slug;
  const isPlaying = isCurrent && playing;
  const disabled = !song.audioUrl;

  return (
    <button
      type="button"
      className={`play${variant === "md" ? "" : ` play--${variant}`}`}
      aria-disabled={disabled || undefined}
      aria-label={
        disabled ? `${title}. ${dict.noAudio}` : `${isPlaying ? dict.pause : dict.play} ${title}`
      }
      title={disabled ? dict.noAudio : undefined}
      onClick={() => !disabled && playSong(song)}
    >
      {isPlaying ? <PauseIcon size={glyph} /> : <PlayIcon size={glyph} />}
    </button>
  );
}
