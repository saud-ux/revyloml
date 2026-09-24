import { NextResponse, type NextRequest } from "next/server";

const LOCALES = ["ar", "en"] as const;
const DEFAULT_LOCALE = "ar";

/**
 * Every public URL carries its locale, so a link shared in Arabic opens in
 * Arabic on someone else's phone. Anything without one is sent to the default.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Locale prefixing is for pages only. API routes, uploaded media and Next's
  // own assets must pass through untouched — /api/health is what keeps a free
  // instance awake, and redirecting it would fail the deploy's health check.
  matcher: ["/((?!api|media|_next|favicon.ico|icon.svg|.*\\.[\\w]+$).*)"],
};
