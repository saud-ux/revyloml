"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type { Song } from "@/lib/types";

type PlayerState = {
  queue: Song[];
  current: Song | null;
  playing: boolean;
  /** seconds elapsed */
  time: number;
  /** seconds; falls back to the song's stored duration before metadata loads */
  length: number;
  /** false when the current song has no uploaded audio file */
  playable: boolean;
  toggle: () => void;
  playSong: (song: Song) => void;
  next: () => void;
  prev: () => void;
  seekTo: (seconds: number) => void;
};

const Ctx = createContext<PlayerState | null>(null);

export function usePlayer(): PlayerState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}

/**
 * Owns the one <audio> element for the whole app. It lives in the locale layout,
 * which Next keeps mounted across client navigations, so playback survives
 * moving between the home page and a song page.
 */
export function PlayerProvider({
  queue,
  initial,
  children,
}: {
  queue: Song[];
  initial?: Song | null;
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Nothing is "playing" until someone presses play — the mini player stays
  // hidden rather than claiming a song it never started.
  const [current, setCurrent] = useState<Song | null>(initial ?? null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(initial?.duration ?? 0);

  const playable = Boolean(current?.audioUrl);

  const indexOfCurrent = useMemo(
    () => (current ? queue.findIndex((s) => s.slug === current.slug) : -1),
    [queue, current],
  );

  const load = useCallback((song: Song, autoplay: boolean) => {
    setCurrent(song);
    setTime(0);
    setLength(song.duration);
    setPlaying(autoplay && Boolean(song.audioUrl));
  }, []);

  const playSong = useCallback(
    (song: Song) => {
      if (current?.slug === song.slug) {
        setPlaying((p) => !p);
        return;
      }
      load(song, true);
    },
    [current, load],
  );

  const step = useCallback(
    (delta: number) => {
      if (queue.length === 0) return;
      const i = indexOfCurrent < 0 ? 0 : indexOfCurrent;
      const nextIndex = (i + delta + queue.length) % queue.length;
      load(queue[nextIndex], playing);
    },
    [queue, indexOfCurrent, playing, load],
  );

  const toggle = useCallback(() => {
    if (!playable) return;
    setPlaying((p) => !p);
  }, [playable]);

  const seekTo = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = seconds;
    setTime(seconds);
  }, []);

  // Drive the element from state rather than the other way round, so every
  // control in the tree stays in sync with one source of truth.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playing, current]);

  const value = useMemo<PlayerState>(
    () => ({
      queue, current, playing, time, length, playable,
      toggle, playSong, next: () => step(1), prev: () => step(-1), seekTo,
    }),
    [queue, current, playing, time, length, playable, toggle, playSong, step, seekTo],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <audio
        ref={audioRef}
        src={current?.audioUrl ?? undefined}
        preload="metadata"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setLength(d);
        }}
        onEnded={() => step(1)}
      />
    </Ctx.Provider>
  );
}
