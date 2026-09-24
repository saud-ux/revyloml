import { listSnapshots } from "@/lib/backup";
import { fill, type Dict, type Locale } from "@/lib/i18n";

/**
 * Shows that backups are running, hands over a copy on demand, and prints the
 * exact URL to paste into a scheduler. The token is visible only behind the
 * admin login, and all it can do is ask the server to file a snapshot.
 */
export async function BackupPanel({
  dict, locale, origin,
}: {
  dict: Dict;
  locale: Locale;
  origin: string;
}) {
  const snapshots = await listSnapshots();
  const latest = snapshots[0];
  const token = process.env.BACKUP_TOKEN;

  const when = latest?.takenAt
    ? new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
        dateStyle: "medium",
        timeZone: "UTC",
        numberingSystem: "latn",
      }).format(new Date(latest.takenAt))
    : null;

  return (
    <section className="guide" style={{ marginBlockStart: 32 }}>
      <h2 className="guide__title">{dict.backups}</h2>
      <p className="field__hint">{dict.backupWhat}</p>
      <p className="row__meta">
        {when ? fill(dict.backupLatest, { when }) : dict.backupNone}
      </p>

      <a href="/api/backup/download" className="btn btn--secondary" download>
        {dict.backupNow}
      </a>

      <p className="field__hint" style={{ marginBlockStart: 4 }}>
        {token ? dict.backupSchedule : dict.backupNoToken}
      </p>
      {token && (
        <code className="backup-url ltr">{`${origin}/api/backup?token=${token}`}</code>
      )}
    </section>
  );
}
