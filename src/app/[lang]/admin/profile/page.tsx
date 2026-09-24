import { getProfile } from "@/lib/data";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { ProfileForm } from "@/components/admin/ProfileForm";

export default async function ProfileSettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const dict = t(locale);
  const profile = await getProfile();
  return (
    <>
      <h1 className="admin-title" style={{ marginBlockEnd: 20 }}>{dict.profile}</h1>
      <ProfileForm locale={locale} dict={dict} profile={profile} />
    </>
  );
}
