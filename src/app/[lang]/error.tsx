"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Shown when a page throws. Without this the visitor gets Next's own error
 * screen: unstyled, in English, and identical whatever went wrong. On a free
 * instance with a database and a storage bucket behind it, a page will throw
 * sooner or later, and it should not look like the site fell over.
 *
 * Deliberately not using the dictionary: this renders when something has
 * already gone wrong, so it depends on nothing that could go wrong with it.
 */
export default function Error({
  error, reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const ar = !usePathname().startsWith("/en");

  return (
    <main className="page">
      <div className="wrap">
        <div className="state" dir={ar ? "rtl" : "ltr"}>
          <h1 className="state__title">
            {ar ? "صار خطأ" : "Something went wrong"}
          </h1>
          <p className="state__body">
            {ar
              ? "جرّب مرة ثانية. إذا تكرر، انتظر شوي ورجع."
              : "Try again. If it keeps happening, give it a minute and come back."}
          </p>
          <button type="button" className="btn btn--primary" onClick={reset}>
            {ar ? "حاول مرة ثانية" : "Try again"}
          </button>
        </div>
      </div>
    </main>
  );
}
