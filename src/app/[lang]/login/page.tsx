import { redirect } from "next/navigation";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { isSignedIn } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { LockIcon } from "@/components/Icons";

export const metadata = { robots: { index: false, follow: false } };

export default async function LoginPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  if (await isSignedIn()) redirect(`/${locale}/admin`);
  const dict = t(locale);

  return (
    <main className="page" style={{ paddingBlockEnd: 0 }}>
      <div className="auth">
        <div className="auth__card">
          <div className="auth__head">
            <span className="auth__lock"><LockIcon /></span>
            <span className="brand tracked">REVYLOML</span>
            <h1 className="state__title">{dict.private}</h1>
            <p className="state__body">{dict.onlyYazan}</p>
          </div>
          <LoginForm locale={locale} dict={dict} />
        </div>
      </div>
    </main>
  );
}
