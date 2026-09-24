import Link from "next/link";
import { other, t, type Locale } from "@/lib/i18n";

/** Sits in the header on every public screen; keeps the path, swaps the locale. */
export function LangToggle({ locale, path }: { locale: Locale; path: string }) {
  const to = other(locale);
  return (
    <Link
      href={`/${to}${path}`}
      className="btn btn--secondary"
      style={{ minHeight: 34, paddingInline: 11, fontSize: 12.5 }}
      aria-label={t(locale).switchLang}
      hrefLang={to}
    >
      {t(locale).langLabel}
    </Link>
  );
}
