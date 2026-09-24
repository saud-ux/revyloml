import { isLocale, t, type Locale } from "@/lib/i18n";
import { SongForm } from "@/components/admin/SongForm";

export default async function NewSongPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const dict = t(locale);
  return (
    <>
      <h1 className="admin-title" style={{ marginBlockEnd: 20 }}>{dict.newSong}</h1>
      <SongForm locale={locale} dict={dict} />
    </>
  );
}
