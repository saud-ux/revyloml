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
  shuffled: boolean;
  toggle: () => void;
  toggleShuffle: () => void;
  playSong: (song: Song) => void;
  /** starts the whole list, optionally in a random order */
  playAll: (shuffle?: boolean) => void;
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

/** Only songs with a file can be played, so shuffle and next skip the rest. */
const playableOnly = (songs: Song[]) => songs.filter((s) => s.audioUrl);

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
  // Nothing is "playing" until someone presses play: the mini player stays
  // hidden rather than claiming a song it never started.
  const [current, setCurrent] = useState<Song | null>(initial ?? null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(initial?.duration ?? 0);
  const [shuffled, setShuffled] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState<string[]>([]);

  const playable = Boolean(current?.audioUrl);

  /** The order next/prev walk: the page order, or the shuffled one. */
  const walk = useMemo(() => {
    const songs = playableOnly(queue);
    if (!shuffled) return songs;
    const bySlug = new Map(songs.map((s) => [s.slug, s]));
    const ordered = shuffleOrder.map((slug) => bySlug.get(slug)).filter(Boolean) as Song[];
    // Anything added since the shuffle was generated still gets a turn.
    return ordered.length === songs.length ? ordered : songs;
  }, [queue, shuffled, shuffleOrder]);

  /**
   * Which song the element is actually holding, which React state cannot say.
   * Starts empty because the element is created without a src.
   */
  const loaded = useRef<string | null>(null);

  /**
   * Starts the element now, inside the tap that asked for it.
   *
   * This cannot go in an effect. iOS only honours play() while it is still
   * running the handler for a real user gesture; called back after React has
   * re-rendered it counts as autoplay and is refused, and the song sits there
   * saying paused with nothing to explain why. That is what it did on a phone
   * for as long as this player has existed, whatever the audio file.
   *
   * Setting src has to happen here for the same reason.
   */
  const startNow = useCallback((song: Song) => {
    const el = audioRef.current;
    if (!el || !song.audioUrl) return;
    if (loaded.current !== song.slug) {
      el.src = song.audioUrl;
      loaded.current = song.slug;
      el.currentTime = 0;
    }
    // State follows the element, through its own play and pause events.
    void el.play().catch(() => setPlaying(false));
  }, []);

  const load = useCallback((song: Song, autoplay: boolean) => {
    setCurrent(song);
    setTime(0);
    setLength(song.duration);
    if (autoplay) startNow(song);
  }, [startNow]);

  const playSong = useCallback(
    (song: Song) => {
      if (current?.slug === song.slug) {
        const el = audioRef.current;
        if (!el) return;
        if (el.paused) startNow(song);
        else el.pause();
        return;
      }
      load(song, true);
    },
    [current, load, startNow],
  );

  const step = useCallback(
    (delta: number) => {
      if (walk.length === 0) return;
      const i = current ? walk.findIndex((s) => s.slug === current.slug) : -1;
      const from = i < 0 ? 0 : i;
      const nextIndex = (from + delta + walk.length) % walk.length;
      load(walk[nextIndex], true);
    },
    [walk, current, load],
  );

  const playAll = useCallback(
    (useShuffle = false) => {
      const songs = playableOnly(queue);
      if (songs.length === 0) return;

      if (useShuffle) {
        const order = shuffle(songs.map((s) => s.slug));
        setShuffleOrder(order);
        setShuffled(true);
        const first = songs.find((s) => s.slug === order[0]);
        if (first) load(first, true);
        return;
      }
      load(songs[0], true);
    },
    [queue, load],
  );

  const toggleShuffle = useCallback(() => {
    setShuffled((on) => {
      if (on) return false;
      // Keep whatever is playing at the head, so turning shuffle on does not
      // interrupt the song someone is listening to.
      const rest = shuffle(playableOnly(queue).map((s) => s.slug).filter((sl) => sl !== current?.slug));
      setShuffleOrder(current ? [current.slug, ...rest] : rest);
      return true;
    });
  }, [queue, current]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !current?.audioUrl) return;
    if (el.paused) startNow(current);
    else el.pause();
  }, [current, startNow]);

  const seekTo = useCallback((seconds: number) => {
    const el = audioRef.current;
    if (el) el.currentTime = seconds;
    setTime(seconds);
  }, []);

  // Only for a song chosen without playing it, so the element is pointed at the
  // right file and its length can be read. Playback itself is never started
  // from here, for the reason given on startNow.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !current?.audioUrl) return;
    if (loaded.current !== current.slug) {
      el.src = current.audioUrl;
      loaded.current = current.slug;
    }
  }, [current]);

  /**
   * Count a play when the track actually starts from the beginning, not on
   * every unpause. A failed count is swallowed: it must never interrupt
   * playback, and it is a number on an admin screen.
   */
  const counted = useRef<string | null>(null);
  const countPlay = useCallback((slug: string) => {
    if (counted.current === slug) return;
    counted.current = slug;
    void fetch("/api/plays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
      keepalive: true,
    }).catch(() => {});
  }, []);

  const value = useMemo<PlayerState>(
    () => ({
      queue, current, playing, time, length, playable, shuffled,
      toggle, toggleShuffle, playSong, playAll,
      next: () => step(1), prev: () => step(-1), seekTo,
    }),
    [queue, current, playing, time, length, playable, shuffled,
     toggle, toggleShuffle, playSong, playAll, step, seekTo],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {/* No src here: it is set imperatively, because changing it through a
          re-render lands after the gesture has ended and iOS then refuses to
          play. */}
      <audio
        ref={audioRef}
        preload="metadata"
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setLength(d);
        }}
        onPlay={(e) => {
          setPlaying(true);
          if (current && e.currentTarget.currentTime < 1) countPlay(current.slug);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => step(1)}
      />
    </Ctx.Provider>
  );
}
