import { siteOrigin } from "@/lib/origin";
import { getProfile } from "@/lib/data";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { ProfileForm } from "@/components/admin/ProfileForm";
import { BackupPanel } from "@/components/admin/BackupPanel";

export default async function ProfileSettingsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const dict = t(locale);
  const profile = await getProfile();

  // The backup panel prints a URL for a scheduler to call.
  const origin = await siteOrigin();

  return (
    <>
      <h1 className="admin-title" style={{ marginBlockEnd: 20 }}>{dict.profile}</h1>
      <ProfileForm locale={locale} dict={dict} profile={profile} />

      {/* Backups sit here rather than on the dashboard: that screen is for the
          songs, and this is maintenance, which belongs with the settings. */}
      <BackupPanel dict={dict} locale={locale} origin={origin} />
    </>
  );
}
