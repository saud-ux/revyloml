import "server-only";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { getProfile, listAllSongs } from "./data";
import { UPLOAD_DIR, storageBackend } from "./storage";

/**
 * Snapshots of everything that is not a file: titles, dates, lyrics, order,
 * visibility, the profile. The audio and artwork live in storage and are not
 * copied here; losing the database is the failure this guards against.
 *
 * Kept in a private bucket beside the media, which covers a bad delete but not
 * losing the whole project. The admin can download one, which is the copy that
 * actually lives somewhere else.
 */
const BUCKET = process.env.SUPABASE_BACKUP_BUCKET ?? "backups";
const KEEP = 8;

export type Snapshot = {
  version: 1;
  takenAt: string;
  profile: Awaited<ReturnType<typeof getProfile>>;
  songs: Awaited<ReturnType<typeof listAllSongs>>;
};

export async function createSnapshot(): Promise<Snapshot> {
  const [profile, songs] = await Promise.all([getProfile(), listAllSongs()]);
  return { version: 1, takenAt: new Date().toISOString(), profile, songs };
}

export const snapshotName = (takenAt: string) =>
  `revyloml-${takenAt.slice(0, 19).replace(/[:T]/g, "-")}.json`;

function supabase(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  return url && key ? { url, key } : null;
}

const authHeaders = (key: string) => ({ apikey: key, Authorization: `Bearer ${key}` });

/** Creating the bucket here saves a manual step in a dashboard on a phone. */
async function ensureBucket(sb: { url: string; key: string }): Promise<void> {
  await fetch(`${sb.url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...authHeaders(sb.key), "Content-Type": "application/json" },
    // Private: a backup is the one thing here that is nobody else's business.
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: false }),
  }).catch(() => {});
}

export type StoredBackup = { name: string; takenAt: string | null };

export async function storeSnapshot(snapshot: Snapshot): Promise<string> {
  const name = snapshotName(snapshot.takenAt);
  const body = JSON.stringify(snapshot, null, 1);
  const sb = supabase();

  if (sb) {
    await ensureBucket(sb);
    const res = await fetch(`${sb.url}/storage/v1/object/${BUCKET}/${name}`, {
      method: "POST",
      headers: { ...authHeaders(sb.key), "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`backup upload failed: ${res.status} ${await res.text().catch(() => "")}`);
  } else {
    const dir = path.join(UPLOAD_DIR, "backups");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), body);
  }

  await prune();
  return name;
}

export async function listSnapshots(): Promise<StoredBackup[]> {
  const sb = supabase();
  const toEntry = (name: string): StoredBackup => {
    const m = name.match(/^revyloml-(\d{4}-\d{2}-\d{2})-(\d{2})-(\d{2})-(\d{2})\.json$/);
    return { name, takenAt: m ? `${m[1]}T${m[2]}:${m[3]}:${m[4]}Z` : null };
  };

  if (sb) {
    const res = await fetch(`${sb.url}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { ...authHeaders(sb.key), "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: "", limit: 100, sortBy: { column: "name", order: "desc" } }),
    }).catch(() => null);
    if (!res?.ok) return [];
    const rows = (await res.json()) as { name: string }[];
    return rows.filter((r) => r.name.endsWith(".json")).map((r) => toEntry(r.name));
  }

  const dir = path.join(UPLOAD_DIR, "backups");
  const names = await readdir(dir).catch(() => [] as string[]);
  return names.filter((n) => n.endsWith(".json")).sort().reverse().map(toEntry);
}

export async function readSnapshot(name: string): Promise<string | null> {
  if (!/^revyloml-[\d-]+\.json$/.test(name)) return null;
  const sb = supabase();

  if (sb) {
    const res = await fetch(`${sb.url}/storage/v1/object/${BUCKET}/${name}`, {
      headers: authHeaders(sb.key),
    }).catch(() => null);
    return res?.ok ? await res.text() : null;
  }
  return readFile(path.join(UPLOAD_DIR, "backups", name), "utf8").catch(() => null);
}

/** Keeps the newest few. Old snapshots of a six song page are not worth space. */
async function prune(): Promise<void> {
  const all = await listSnapshots();
  const extra = all.slice(KEEP);
  if (extra.length === 0) return;
  const sb = supabase();

  if (sb) {
    await fetch(`${sb.url}/storage/v1/object/${BUCKET}`, {
      method: "DELETE",
      headers: { ...authHeaders(sb.key), "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: extra.map((e) => e.name) }),
    }).catch(() => {});
    return;
  }
  await Promise.all(
    extra.map((e) => unlink(path.join(UPLOAD_DIR, "backups", e.name)).catch(() => {})),
  );
}

export { storageBackend };
