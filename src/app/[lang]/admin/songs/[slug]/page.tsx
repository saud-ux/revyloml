import { notFound } from "next/navigation";
import { getSong } from "@/lib/data";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { SongForm } from "@/components/admin/SongForm";

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ lang: string; slug: string }>;
}) {
  const { lang, slug } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const dict = t(locale);
  const song = await getSong(slug);
  if (!song) notFound();

  return (
    <>
      <h1 className="admin-title" style={{ marginBlockEnd: 20 }}>{dict.editSong}</h1>
      <SongForm locale={locale} dict={dict} song={song} />
    </>
  );
}
