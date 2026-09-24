import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["ar", "en"] as const;
const DEFAULT_LOCALE = "ar";

/**
 * Picks a locale from the browser's Accept-Language header.
 *
 * An Arabic phone gets Arabic, anything else gets English: most people who open
 * a shared link will not read Arabic unless their device says they do, and a
 * page they cannot read is worse than one in the wrong script for the owner.
 * Only the first visit goes through here. Every link on the site carries its
 * locale, so a link Yazan shares in Arabic opens in Arabic for everyone.
 */
function preferredLocale(header: string | null): string {
  if (!header) return DEFAULT_LOCALE;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.split("=")[1]) : 1 };
    })
    .filter((entry) => entry.tag && !Number.isNaN(entry.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (base === "ar") return "ar";
    if (base === "en") return "en";
  }
  return "en";
}

/**
 * Every public URL carries its locale, so a link shared in Arabic opens in
 * Arabic on someone else's phone. Anything without one is sent to the language
 * their device asks for.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const locale = preferredLocale(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Locale prefixing is for pages only. API routes, uploaded media and Next's
  // own assets must pass through untouched — /api/health is what keeps a free
  // instance awake, and redirecting it would fail the deploy's health check.
  matcher: ["/((?!api|media|_next|favicon.ico|icon.svg|.*\\.[\\w]+$).*)"],
};
