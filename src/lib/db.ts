import "server-only";
import { Pool } from "pg";
import seedSongs from "../../data/songs.json";
import { SCHEMA } from "./schema";

/**
 * Postgres over DATABASE_URL. The same URL works for Render Postgres and for
 * Supabase, so the hosting choice stays open.
 *
 * With no DATABASE_URL the app runs read-only off the JSON seed — `npm run dev`
 * needs no database at all.
 */

let pool: Pool | null = null;
let ready: Promise<void> | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Render and Supabase both terminate TLS with a cert this container does
      // not have in its trust store; the connection is still encrypted.
      ssl: process.env.DATABASE_SSL === "off" ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

/**
 * Creates the schema on first use and seeds it once. Safe to run on every boot:
 * the seed only fires into an empty songs table, so it never overwrites
 * anything Yazan has since edited or deleted.
 */
async function migrate(): Promise<void> {
  const db = getPool();
  await db.query(SCHEMA);
  await db.query(
    `INSERT INTO profile (id, name_ar, name_en) VALUES (1, 'يزن', 'Yazan')
     ON CONFLICT (id) DO NOTHING`,
  );

  const { rows } = await db.query<{ n: string }>("SELECT count(*) AS n FROM songs");
  if (Number(rows[0].n) > 0) return;

  for (const s of seedSongs as SeedSong[]) {
    await db.query(
      `INSERT INTO songs (slug, title_ar, title_en, released_at, duration, audio_url,
                          cover_url, lyrics, visibility, pinned, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (slug) DO NOTHING`,
      [s.slug, s.title.ar, s.title.en, s.releasedAt, s.duration, s.audioUrl,
       s.coverUrl, s.lyrics, s.visibility, s.pinned, s.position],
    );
  }
}

type SeedSong = {
  slug: string; title: { ar: string; en: string }; releasedAt: string; duration: number;
  audioUrl: string | null; coverUrl: string | null; lyrics: string;
  visibility: string; pinned: boolean; position: number;
};

export async function query<T extends Record<string, unknown>>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is not set");
  ready ??= migrate();
  await ready;
  const res = await getPool().query(text, values);
  return res.rows as T[];
}

/**
 * Runs several statements on one connection inside a transaction. Needed where
 * a database constraint spans statements — pinning has to unpin the old
 * featured song and pin the new one without ever having two, or none.
 */
export async function transaction(
  run: (q: (text: string, values?: unknown[]) => Promise<void>) => Promise<void>,
): Promise<void> {
  if (!hasDatabase()) throw new Error("DATABASE_URL is not set");
  ready ??= migrate();
  await ready;

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await run(async (text, values = []) => {
      await client.query(text, values);
    });
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
