"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Cover } from "@/components/Cover";
import {
  ChevronDownIcon, ChevronUpIcon, EyeIcon, EyeOffIcon, GripIcon,
  PencilIcon, PinIcon, TrashIcon,
} from "@/components/Icons";
import { removeSong, saveOrder, togglePinned, toggleVisibility } from "@/app/actions";
import { duration, monthYear } from "@/lib/format";
import type { Dict, Locale } from "@/lib/i18n";
import type { Song } from "@/lib/types";

/**
 * Drag to reorder, with up/down buttons alongside — a list you can only reorder
 * by dragging is a list some people cannot reorder at all.
 *
 * The parent keys this component on the server's song order, so anything that
 * changes the list server-side (a delete, a pin) remounts it with fresh state.
 */
export function AdminSongList({
  songs, locale, dict,
}: {
  songs: Song[];
  locale: Locale;
  dict: Dict;
}) {
  const [order, setOrder] = useState(songs);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function commit(next: Song[]) {
    setOrder(next);
    startTransition(() => {
      void saveOrder(next.map((s) => s.slug));
    });
  }

  function move(slug: string, delta: number) {
    const i = order.findIndex((s) => s.slug === slug);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  }

  function onDrop(targetSlug: string) {
    if (!dragging || dragging === targetSlug) return;
    const from = order.findIndex((s) => s.slug === dragging);
    const to = order.findIndex((s) => s.slug === targetSlug);
    if (from < 0 || to < 0) return;
    const next = [...order];
    next.splice(to, 0, next.splice(from, 1)[0]);
    commit(next);
  }

  return (
    <>
      <p className="hint"><GripIcon size={15} /> {dict.reorder}</p>
      <ul className="admin-list">
        {order.map((song, i) => {
          const name = song.title[locale];
          return (
            <li
              key={song.slug}
              className={[
                "admin-row",
                song.visibility === "hidden" ? "admin-row--hidden" : "",
                dragging === song.slug ? "admin-row--dragging" : "",
              ].filter(Boolean).join(" ")}
              draggable
              onDragStart={() => setDragging(song.slug)}
              onDragEnd={() => setDragging(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(song.slug)}
            >
              <span className="admin-row__grip" aria-hidden><GripIcon /></span>

              <Cover size={44} title={name} slug={song.slug} url={song.coverUrl} radius={4} />

              <span className="admin-row__main">
                <span className="admin-row__title">{name}</span>
                <span className="row__meta">
                  {monthYear(song.releasedAt, locale)} · <span className="num">{duration(song.duration)}</span>
                </span>
              </span>

              <span className={`chip ${song.pinned ? "chip--accent" : "chip--mute"}`}>
                {song.pinned ? dict.pinned : song.visibility === "hidden" ? dict.hidden : dict.public}
              </span>

              <span className="admin-row__actions">
                <button type="button" className="iconbtn" onClick={() => move(song.slug, -1)}
                        disabled={i === 0} aria-label={`${dict.moveUp}: ${name}`}>
                  <ChevronUpIcon />
                </button>
                <button type="button" className="iconbtn" onClick={() => move(song.slug, 1)}
                        disabled={i === order.length - 1} aria-label={`${dict.moveDown}: ${name}`}>
                  <ChevronDownIcon />
                </button>

                <form action={togglePinned}>
                  <input type="hidden" name="slug" value={song.slug} />
                  <input type="hidden" name="pinned" value={String(!song.pinned)} />
                  <button type="submit" className={`iconbtn${song.pinned ? " iconbtn--on" : ""}`}
                          aria-label={`${song.pinned ? dict.unpin : dict.pin}: ${name}`}>
                    <PinIcon />
                  </button>
                </form>

                <form action={toggleVisibility}>
                  <input type="hidden" name="slug" value={song.slug} />
                  <input type="hidden" name="visibility" value={song.visibility === "hidden" ? "public" : "hidden"} />
                  <button type="submit" className="iconbtn"
                          aria-label={`${song.visibility === "hidden" ? dict.show : dict.hide}: ${name}`}>
                    {song.visibility === "hidden" ? <EyeIcon /> : <EyeOffIcon />}
                  </button>
                </form>

                <Link href={`/${locale}/admin/songs/${song.slug}`} className="iconbtn"
                      aria-label={`${dict.edit}: ${name}`}>
                  <PencilIcon />
                </Link>

                <form action={removeSong} onSubmit={(e) => { if (!confirm(dict.confirmDelete)) e.preventDefault(); }}>
                  <input type="hidden" name="slug" value={song.slug} />
                  <button type="submit" className="iconbtn iconbtn--danger" aria-label={`${dict.remove}: ${name}`}>
                    <TrashIcon />
                  </button>
                </form>
              </span>
            </li>
          );
        })}
      </ul>
    </>
  );
}
