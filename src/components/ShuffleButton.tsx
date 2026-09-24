"use client";

import { usePlayer } from "@/player/PlayerProvider";
import { ShuffleIcon } from "./Icons";
import type { Dict } from "@/lib/i18n";

/** Starts the whole list in a random order. */
export function ShuffleButton({ dict }: { dict: Dict }) {
  const { playAll, queue } = usePlayer();
  const nothingToPlay = queue.every((s) => !s.audioUrl);

  return (
    <button
      type="button"
      className="btn btn--secondary"
      onClick={() => playAll(true)}
      aria-disabled={nothingToPlay || undefined}
      title={nothingToPlay ? dict.noAudio : undefined}
    >
      <ShuffleIcon size={16} /> {dict.shuffle}
    </button>
  );
}
