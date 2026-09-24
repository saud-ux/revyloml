"use client";

import { useSyncExternalStore } from "react";
import { CheckIcon } from "@/components/Icons";
import { fill, type Dict } from "@/lib/i18n";

const KEY = "revylo.guide.dismissed";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Storage blocked: the guide simply shows every visit.
    return false;
  }
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function dismissStored(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* nothing to do; it reappears next visit */
  }
  for (const listener of listeners) listener();
}

/**
 * A short explanation of the parts of this page that are not obvious: what
 * hidden means, where the public link is, that the order here is the order
 * people see. Two people share this login, so one of them may arrive without
 * the other having explained any of it.
 *
 * The dismissal lives in this browser, which the server cannot know, so it is
 * read through useSyncExternalStore: the server renders the guide, and a
 * browser that has dismissed it drops it on hydration without a mismatch.
 */
export function AdminGuide({ dict, publicUrl }: { dict: Dict; publicUrl: string }) {
  const dismissed = useSyncExternalStore(subscribe, read, () => false);
  if (dismissed) return null;

  return (
    <aside className="guide">
      <h2 className="guide__title">{dict.guideTitle}</h2>
      <ul className="guide__list">
        <li>{fill(dict.guideShare, { url: publicUrl })}</li>
        <li>{dict.guideHidden}</li>
        <li>{dict.guideOrder}</li>
        <li>{dict.guidePin}</li>
      </ul>
      <button type="button" className="btn btn--secondary" onClick={dismissStored}>
        <CheckIcon size={15} /> {dict.guideDismiss}
      </button>
    </aside>
  );
}
