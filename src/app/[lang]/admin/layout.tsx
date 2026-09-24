import Link from "next/link";
import { redirect } from "next/navigation";
import { isSignedIn } from "@/lib/auth";
import { hasDatabase } from "@/lib/data";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { signOut } from "@/app/actions";
import { LangToggle } from "@/components/LangToggle";

export const metadata = { robots: { index: false, follow: false } };

/**
 * The guard for every admin page. Server actions re-check the session on their
 * own — this only keeps the pages from rendering.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  if (!(await isSignedIn())) redirect(`/${locale}/login`);
  const dict = t(locale);

  return (
    <main className="page">
      <div className="wrap">
        <header className="topbar">
          <Link href={`/${locale}`} className="brand tracked">revyloml</Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LangToggle locale={locale} path="/admin" />
            <form action={signOut}>
              <input type="hidden" name="locale" value={locale} />
              <button type="submit" className="btn btn--ghost">{dict.signOut}</button>
            </form>
          </div>
        </header>
        {!hasDatabase() && <p className="banner" role="status">{dict.readOnly}</p>}
        {children}
      </div>
    </main>
  );
}
