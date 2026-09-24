"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Cover } from "@/components/Cover";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  GripIcon,
  PencilIcon,
  PinIcon,
  TrashIcon,
} from "@/components/Icons";
import {
  removeSong,
  saveOrder,
  togglePinned,
  toggleVisibility,
} from "@/app/actions";
import { copyText } from "@/lib/clipboard";
import { duration, monthYear } from "@/lib/format";
import { fill, type Dict, type Locale } from "@/lib/i18n";
import type { Song } from "@/lib/types";

/**
 * Reorder by dragging the handle or with the arrow buttons.
 *
 * The dragging is built on pointer events, not HTML5 drag and drop. Drag and
 * drop does not fire on touch screens at all, and this is a page its owner will
 * open on a phone. The arrows stay regardless: a list you can only reorder by
 * dragging is a list some people cannot reorder.
 *
 * The parent keys this component on the server's song order, so anything that
 * changes the list server-side remounts it with fresh state.
 */
export function AdminSongList({
  songs,
  locale,
  dict,
  origin,
}: {
  songs: Song[];
  locale: Locale;
  dict: Dict;
  origin: string;
}) {
  const [order, setOrder] = useState(songs);
  const [dragging, setDragging] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // The pointer handlers live on the window, not on the handle. Reordering
  // moves the handle's own row in the DOM, which drops its pointer capture, so
  // an element-bound pointerup never fires and the new order was never saved.
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  function persist(next: Song[]) {
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
    setOrder(next);
    persist(next);
  }

  /** Moves the dragged song to wherever the finger currently is. */
  function dragOver(clientX: number, clientY: number, slug: string) {
    const el = document
      .elementFromPoint(clientX, clientY)
      ?.closest("[data-slug]");
    const overSlug = el instanceof HTMLElement ? el.dataset.slug : undefined;
    if (!overSlug || overSlug === slug) return;

    setOrder((current) => {
      const from = current.findIndex((s) => s.slug === slug);
      const to = current.findIndex((s) => s.slug === overSlug);
      if (from < 0 || to < 0 || from === to) return current;
      const next = [...current];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  }

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) =>
      dragOver(e.clientX, e.clientY, dragging);
    const onEnd = () => {
      setDragging(null);
      persist(orderRef.current);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
     
  }, [dragging]);

  async function copyLink(slug: string) {
    const ok = await copyText(`${origin}/${locale}/s/${slug}`);
    if (!ok) return;
    setCopied(slug);
    setTimeout(() => setCopied((c) => (c === slug ? null : c)), 1800);
  }

  return (
    <>
      <p className="hint">
        <GripIcon size={15} /> {dict.reorder}
      </p>
      <ul className="admin-list">
        {order.map((song, i) => {
          const name = song.title[locale];
          return (
            <li
              key={song.slug}
              data-slug={song.slug}
              className={[
                "admin-row",
                song.visibility === "hidden" ? "admin-row--hidden" : "",
                dragging === song.slug ? "admin-row--dragging" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <button
                type="button"
                className="admin-row__grip"
                aria-label={`${dict.reorder}: ${name}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDragging(song.slug);
                }}
              >
                <GripIcon />
              </button>

              <Cover
                size={44}
                title={name}
                slug={song.slug}
                url={song.coverUrl}
                radius={4}
              />

              <span className="admin-row__main">
                <span className="admin-row__title">{name}</span>
                <span className="row__meta">
                  {monthYear(song.releasedAt, locale)} ·{" "}
                  <span className="num">{duration(song.duration)}</span>
                  {" · "}
                  <span className="num">
                    {fill(dict.plays, { n: song.plays })}
                  </span>
                </span>
              </span>

              <span
                className={`chip ${song.pinned ? "chip--accent" : "chip--mute"}`}
              >
                {song.pinned
                  ? dict.pinned
                  : song.visibility === "hidden"
                    ? dict.hidden
                    : dict.public}
              </span>

              <span className="admin-row__actions">
                <button
                  type="button"
                  className="iconbtn"
                  onClick={() => move(song.slug, -1)}
                  disabled={i === 0}
                  aria-label={`${dict.moveUp}: ${name}`}
                >
                  <ChevronUpIcon />
                </button>
                <button
                  type="button"
                  className="iconbtn"
                  onClick={() => move(song.slug, 1)}
                  disabled={i === order.length - 1}
                  aria-label={`${dict.moveDown}: ${name}`}
                >
                  <ChevronDownIcon />
                </button>

                {/* The only way to get a hidden song's link, which is the whole
                    point of hiding one. */}
                <button
                  type="button"
                  className={`iconbtn${copied === song.slug ? " iconbtn--on" : ""}`}
                  onClick={() => void copyLink(song.slug)}
                  aria-label={`${dict.copyLinkShort}: ${name}`}
                >
                  {copied === song.slug ? (
                    <CheckIcon size={17} />
                  ) : (
                    <CopyIcon size={17} />
                  )}
                </button>

                <form action={togglePinned}>
                  <input type="hidden" name="slug" value={song.slug} />
                  <input
                    type="hidden"
                    name="pinned"
                    value={String(!song.pinned)}
                  />
                  <button
                    type="submit"
                    className={`iconbtn${song.pinned ? " iconbtn--on" : ""}`}
                    aria-label={`${song.pinned ? dict.unpin : dict.pin}: ${name}`}
                  >
                    <PinIcon />
                  </button>
                </form>

                <form action={toggleVisibility}>
                  <input type="hidden" name="slug" value={song.slug} />
                  <input
                    type="hidden"
                    name="visibility"
                    value={song.visibility === "hidden" ? "public" : "hidden"}
                  />
                  <button
                    type="submit"
                    className="iconbtn"
                    aria-label={`${song.visibility === "hidden" ? dict.show : dict.hide}: ${name}`}
                  >
                    {song.visibility === "hidden" ? (
                      <EyeIcon />
                    ) : (
                      <EyeOffIcon />
                    )}
                  </button>
                </form>

                <Link
                  href={`/${locale}/admin/songs/${song.slug}`}
                  className="iconbtn"
                  aria-label={`${dict.edit}: ${name}`}
                >
                  <PencilIcon />
                </Link>

                <form
                  action={removeSong}
                  onSubmit={(e) => {
                    if (!confirm(dict.confirmDelete)) e.preventDefault();
                  }}
                >
                  <input type="hidden" name="slug" value={song.slug} />
                  <button
                    type="submit"
                    className="iconbtn iconbtn--danger"
                    aria-label={`${dict.remove}: ${name}`}
                  >
                    <TrashIcon />
                  </button>
                </form>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" role="status">
        {copied ? dict.linkCopied : ""}
      </p>
    </>
  );
}
