import Link from "next/link";
import { NoteIcon } from "@/components/Icons";
import { DEFAULT_LOCALE, t } from "@/lib/i18n";

/**
 * A missing song is the common case here: someone mistypes a shared link, or
 * the song was deleted after being shared. This page is not a dead end.
 */
export default function NotFound() {
  const dict = t(DEFAULT_LOCALE);
  return (
    <main className="page">
      <div className="state">
        <span className="state__icon"><NoteIcon /></span>
        <h1 className="state__title">{dict.notFoundTitle}</h1>
        <p className="state__body">{dict.notFoundBody}</p>
        <Link href={`/${DEFAULT_LOCALE}`} className="btn btn--primary">{dict.goHome}</Link>
      </div>
    </main>
  );
}
