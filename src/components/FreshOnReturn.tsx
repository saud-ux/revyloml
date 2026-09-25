"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Asks the server for the page again whenever you come back to it.
 *
 * Deleting a song in the dashboard clears it from the database at once, but a
 * page that is already on screen keeps showing what it rendered — a second tab
 * never hears about it, and the phone's back button restores the old page
 * whole, without asking the server anything. So the page asks by itself: every
 * time it becomes visible again, it refetches, and the deleted song is gone.
 *
 * Playback survives. A refresh re-renders the server components and merges the
 * result into the running app; the <audio> lives in the provider above this and
 * is never remounted.
 */
export function FreshOnReturn() {
  const router = useRouter();
  const last = useRef(0);

  useEffect(() => {
    // Both events can fire for a single return to the page, and a tab switch
    // can bounce twice on its own. One round trip is enough.
    const refresh = () => {
      const now = Date.now();
      if (now - last.current < 2000) return;
      last.current = now;
      router.refresh();
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    // Restored from the back/forward cache: the page comes back exactly as it
    // was left, so nothing else would tell it the list has changed.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) refresh();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onShow);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onShow);
    };
  }, [router]);

  return null;
}
