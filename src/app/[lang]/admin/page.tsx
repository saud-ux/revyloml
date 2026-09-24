import Link from "next/link";
import { listAllSongs } from "@/lib/data";
import { fill, isLocale, t, type Locale } from "@/lib/i18n";
import { AdminSongList } from "@/components/admin/AdminSongList";
import { PlusIcon, UserIcon } from "@/components/Icons";

export default async function AdminPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const dict = t(locale);
  const songs = await listAllSongs();
  const hiddenCount = songs.filter((s) => s.visibility === "hidden").length;

  return (
    <>
      <div className="admin-head">
        <div>
          <h1 className="admin-title">{dict.yourSongs}</h1>
          <p className="row__meta">{fill(dict.total, { n: songs.length, h: hiddenCount })}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/${locale}/admin/profile`} className="btn btn--secondary">
            <UserIcon size={16} /> {dict.profile}
          </Link>
          <Link href={`/${locale}/admin/songs/new`} className="btn btn--primary">
            <PlusIcon size={18} /> {dict.upload}
          </Link>
        </div>
      </div>

      {songs.length === 0 ? (
        <p className="state__body" style={{ padding: "32px 10px" }}>{dict.noSongs}</p>
      ) : (
        <AdminSongList
          key={songs.map((s) => s.slug).join()}
          songs={songs}
          locale={locale}
          dict={dict}
        />
      )}
    </>
  );
}
