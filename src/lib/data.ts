import "server-only";
import songsSeed from "../../data/songs.json";
import profileSeed from "../../data/profile.json";
import type { Profile, Song, Visibility } from "./types";
import { hasDatabase, query, transaction } from "./db";

/**
 * The only place the app reads or writes content.
 *
 * With DATABASE_URL set it talks to Postgres. Without one it serves the JSON
 * seed read-only, so `npm run dev` works with no setup — writes throw rather
 * than silently doing nothing.
 */

type Row = {
  slug: string; title_ar: string; title_en: string; released_at: Date | string;
  duration: number; audio_url: string | null; cover_url: string | null;
  lyrics: string; visibility: Visibility; pinned: boolean; position: number; plays: number;
  updated_at: Date | string | null; updated_by: string;
};

const toSong = (r: Row): Song => ({
  slug: r.slug,
  title: { ar: r.title_ar, en: r.title_en },
  releasedAt: (r.released_at instanceof Date ? r.released_at.toISOString() : String(r.released_at)).slice(0, 10),
  duration: r.duration,
  audioUrl: r.audio_url,
  coverUrl: r.cover_url,
  lyrics: r.lyrics,
  visibility: r.visibility,
  pinned: r.pinned,
  position: r.position,
  plays: r.plays ?? 0,
  updatedAt: r.updated_at
    ? (r.updated_at instanceof Date ? r.updated_at.toISOString() : String(r.updated_at))
    : null,
  updatedBy: r.updated_by ?? "",
});

const seedSongs = songsSeed as Song[];
const seedProfile = profileSeed as Profile;
const byPosition = (a: Song, b: Song) => a.position - b.position;

const COLUMNS = `slug, title_ar, title_en, released_at, duration, audio_url,
                 cover_url, lyrics, visibility, pinned, position, plays,
                 updated_at, updated_by`;
const SELECT = `SELECT ${COLUMNS} FROM songs`;

// ---------------------------------------------------------------- reads

/** Songs listed on the public page. Hidden songs are deliberately excluded. */
export type SongOrder = "custom" | "newest";

/**
 * Songs listed on the public page. Hidden songs are deliberately excluded.
 *
 * "custom" is the order Yazan dragged them into and is the default, because it
 * is the one he controls. "newest" is the visitor's own override.
 */
export async function listPublicSongs(order: SongOrder = "custom"): Promise<Song[]> {
  const by = order === "newest"
    ? "released_at DESC, position"
    : "position, created_at DESC";
  if (!hasDatabase()) {
    const pub = seedSongs.filter((s) => s.visibility === "public");
    return order === "newest"
      ? pub.sort((a, b) => b.releasedAt.localeCompare(a.releasedAt))
      : pub.sort(byPosition);
  }
  const rows = await query<Row>(`${SELECT} WHERE visibility = 'public' ORDER BY ${by}`);
  return rows.map(toSong);
}

/** Every song, hidden ones included. Admin only. */
export async function listAllSongs(): Promise<Song[]> {
  if (!hasDatabase()) return [...seedSongs].sort(byPosition);
  const rows = await query<Row>(`${SELECT} ORDER BY position, created_at DESC`);
  return rows.map(toSong);
}

/**
 * Resolves a shared link. Hidden songs ARE returned here — that is the whole
 * point of "hidden": off the list, reachable by direct link.
 */
export async function getSong(slug: string): Promise<Song | null> {
  if (!hasDatabase()) return seedSongs.find((s) => s.slug === slug) ?? null;
  const rows = await query<Row>(`${SELECT} WHERE slug = $1`, [slug]);
  return rows[0] ? toSong(rows[0]) : null;
}

export async function getFeaturedSong(): Promise<Song | null> {
  const pub = await listPublicSongs();
  return pub.find((s) => s.pinned) ?? pub[0] ?? null;
}

export async function getProfile(): Promise<Profile> {
  if (!hasDatabase()) return seedProfile;
  const rows = await query<{
    handle: string; name_ar: string; name_en: string; bio_ar: string;
    bio_en: string; photo_url: string | null; accent: string;
    instagram: string; tiktok: string; snapchat: string; x_handle: string;
  }>(`SELECT handle, name_ar, name_en, bio_ar, bio_en, photo_url, accent,
             instagram, tiktok, snapchat, x_handle FROM profile WHERE id = 1`);
  const r = rows[0];
  if (!r) return seedProfile;
  return {
    handle: r.handle,
    name: { ar: r.name_ar, en: r.name_en },
    bio: { ar: r.bio_ar, en: r.bio_en },
    photoUrl: r.photo_url,
    accent: r.accent,
    social: {
      instagram: r.instagram ?? "",
      tiktok: r.tiktok ?? "",
      snapchat: r.snapchat ?? "",
      x: r.x_handle ?? "",
    },
  };
}

// ---------------------------------------------------------------- writes

function requireDatabase(): void {
  if (!hasDatabase()) {
    throw new Error("This deployment has no DATABASE_URL, so content is read-only.");
  }
}

export type SongInput = {
  title: { ar: string; en: string };
  releasedAt: string;
  duration: number;
  audioUrl: string | null;
  coverUrl: string | null;
  lyrics: string;
  visibility: Visibility;
};

export async function createSong(slug: string, input: SongInput): Promise<void> {
  requireDatabase();
  await query(
    `INSERT INTO songs (slug, title_ar, title_en, released_at, duration, audio_url,
                        cover_url, lyrics, visibility, position)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,
             COALESCE((SELECT MIN(position) - 1 FROM songs), 0))`,
    [slug, input.title.ar, input.title.en, input.releasedAt, input.duration,
     input.audioUrl, input.coverUrl, input.lyrics, input.visibility],
  );
}

export async function updateSong(slug: string, input: SongInput): Promise<void> {
  requireDatabase();
  await query(
    `UPDATE songs SET title_ar=$2, title_en=$3, released_at=$4, duration=$5,
            audio_url=$6, cover_url=$7, lyrics=$8, visibility=$9 WHERE slug=$1`,
    [slug, input.title.ar, input.title.en, input.releasedAt, input.duration,
     input.audioUrl, input.coverUrl, input.lyrics, input.visibility],
  );
}

export async function deleteSong(slug: string): Promise<Song | null> {
  requireDatabase();
  const rows = await query<Row>(`DELETE FROM songs WHERE slug = $1 RETURNING ${COLUMNS}`, [slug]);
  return rows[0] ? toSong(rows[0]) : null;
}

export async function setVisibility(slug: string, visibility: Visibility): Promise<void> {
  requireDatabase();
  await query(`UPDATE songs SET visibility = $2 WHERE slug = $1`, [slug, visibility]);
}

/**
 * Pinning is exclusive — the home page has one featured slot, and a partial
 * unique index in the schema enforces it, so the unpin has to land first.
 */
export async function setPinned(slug: string, pinned: boolean): Promise<void> {
  requireDatabase();
  // One transaction, one connection: a partial unique index enforces "at most
  // one pinned song", so the unpin and the pin must not be seen apart.
  await transaction(async (q) => {
    if (pinned) await q(`UPDATE songs SET pinned = false WHERE pinned`);
    await q(`UPDATE songs SET pinned = $2 WHERE slug = $1`, [slug, pinned]);
  });
}

export async function reorderSongs(slugs: string[]): Promise<void> {
  requireDatabase();
  await query(
    `UPDATE songs SET position = data.position
       FROM (SELECT * FROM unnest($1::text[], $2::int[]) AS t(slug, position)) AS data
      WHERE songs.slug = data.slug`,
    [slugs, slugs.map((_, i) => i)],
  );
}

/**
 * Counted when a song actually starts, not when the page loads. Failures are
 * swallowed by the caller: a missed count must never interrupt playback.
 */
export async function recordPlay(slug: string): Promise<void> {
  if (!hasDatabase()) return;
  await query(`UPDATE songs SET plays = plays + 1 WHERE slug = $1`, [slug]);
}

export async function updateProfile(p: Profile): Promise<void> {
  requireDatabase();
  await query(
    `UPDATE profile SET handle=$1, name_ar=$2, name_en=$3, bio_ar=$4, bio_en=$5,
            photo_url=$6, accent=$7, instagram=$8, tiktok=$9, snapchat=$10,
            x_handle=$11 WHERE id = 1`,
    [p.handle, p.name.ar, p.name.en, p.bio.ar, p.bio.en, p.photoUrl, p.accent,
     p.social.instagram, p.social.tiktok, p.social.snapchat, p.social.x],
  );
}

/** Short, unguessable, and readable over the phone. */
export function newSlug(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export { hasDatabase };
