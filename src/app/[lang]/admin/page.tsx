import Link from "next/link";
import { listAllSongs } from "@/lib/data";
import { fill, isLocale, t, type Locale } from "@/lib/i18n";
import { AdminSongList } from "@/components/admin/AdminSongList";
import { AdminGuide } from "@/components/admin/AdminGuide";
import { BackupPanel } from "@/components/admin/BackupPanel";
import { headers } from "next/headers";
import { PlusIcon, UserIcon } from "@/components/Icons";

export default async function AdminPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const locale: Locale = isLocale(lang) ? lang : "ar";
  const dict = t(locale);
  const songs = await listAllSongs();
  const hiddenCount = songs.filter((s) => s.visibility === "hidden").length;

  // The address the browser actually used, so the guide shows the real link
  // rather than one built from a variable that may not be set.
  const host = (await headers()).get("host") ?? "";
  const proto = process.env.NODE_ENV === "production" ? "https" : "http";
  const origin = process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL ?? (host ? `${proto}://${host}` : "");
  const publicUrl = `${origin}/${locale}`;

  return (
    <>
      <AdminGuide dict={dict} publicUrl={publicUrl} />
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
          origin={origin}
        />
      )}

      <BackupPanel dict={dict} locale={locale} origin={origin} />
    </>
  );
}
