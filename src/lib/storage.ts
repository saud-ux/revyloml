import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Uploaded audio and cover art.
 *
 * Two backends, chosen by environment:
 *
 *   Supabase Storage  when SUPABASE_URL and SUPABASE_SERVICE_KEY are set.
 *                     Needed on a free Render instance, which has no disk —
 *                     the container filesystem is wiped on every deploy.
 *   Local disk        otherwise. Fine for development, and for a paid Render
 *                     instance with a disk mounted at UPLOAD_DIR.
 *
 * Both return a URL the browser can use directly, so nothing else in the app
 * knows or cares which one is in play.
 */

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".uploads");
const BUCKET = process.env.SUPABASE_BUCKET ?? "media";

function supabase(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  return url && key ? { url, key } : null;
}

export function storageBackend(): "supabase" | "disk" {
  return supabase() ? "supabase" : "disk";
}

const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
]);
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXT: Record<string, string> = {
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/ogg": ".ogg",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export type StorageHealth =
  | { ok: true; backend: "supabase" | "disk"; bucket?: string }
  | { ok: false; backend: "supabase" | "disk"; bucket?: string; reason: "no-bucket" | "unauthorized" | "unreachable" };

/**
 * Answers whether uploads will actually work, so the admin can say what is
 * wrong instead of letting every upload fail with a generic error. The usual
 * cause is a missing bucket: the project and the bucket are separate things and
 * easy to confuse when they share a name.
 */
export async function checkStorage(): Promise<StorageHealth> {
  const sb = supabase();
  if (!sb) return { ok: true, backend: "disk" };

  try {
    const res = await fetch(`${sb.url}/storage/v1/bucket/${BUCKET}`, {
      headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` },
      cache: "no-store",
    });
    if (res.ok) return { ok: true, backend: "supabase", bucket: BUCKET };
    if (res.status === 404) return { ok: false, backend: "supabase", bucket: BUCKET, reason: "no-bucket" };
    if (res.status === 401 || res.status === 403) {
      return { ok: false, backend: "supabase", bucket: BUCKET, reason: "unauthorized" };
    }
    return { ok: false, backend: "supabase", bucket: BUCKET, reason: "unreachable" };
  } catch {
    return { ok: false, backend: "supabase", bucket: BUCKET, reason: "unreachable" };
  }
}

export type Ticket =
  | { ok: true; uploadUrl: string; publicUrl: string; contentType: string }
  | { ok: false; error: "type" | "size" | "disk" | "upstream" };

/**
 * A one-off permission slip for the browser to upload a single file straight
 * into Supabase, skipping this server entirely.
 *
 * The obvious design — post the file to a server action and forward it — is the
 * one that shipped, and it never worked: a server action body is capped at 1 MB,
 * so every song and every cover was rejected with a 413 before any of our code
 * ran. Raising the cap would only move the problem, because the free instance
 * has 512 MB of memory and would have to hold the whole file, then send it to
 * Singapore a second time. A signed URL means the file makes one trip, from the
 * phone to the bucket.
 *
 * The slip is minted only for a signed-in admin, names the file itself, and
 * expires. The bucket enforces the size and type limits again on arrival, since
 * the numbers checked here are whatever the browser claimed.
 */
export async function createUploadTicket(
  kind: "audio" | "image",
  contentType: string,
  size: number,
): Promise<Ticket> {
  const allowed = kind === "audio" ? AUDIO_TYPES : IMAGE_TYPES;
  const limit = kind === "audio" ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
  if (!allowed.has(contentType)) return { ok: false, error: "type" };
  if (size > limit) return { ok: false, error: "size" };

  const sb = supabase();
  // No bucket configured: the caller falls back to posting the file, which is
  // what local development does and what the 1 MB cap is generous enough for.
  if (!sb) return { ok: false, error: "disk" };

  const name = `${randomBytes(12).toString("hex")}${EXT[contentType] ?? ""}`;

  let res: Response;
  try {
    res = await fetch(`${sb.url}/storage/v1/object/upload/sign/${BUCKET}/${name}`, {
      method: "POST",
      headers: {
        apikey: sb.key,
        Authorization: `Bearer ${sb.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 60 * 30 }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("Supabase sign unreachable", err);
    return { ok: false, error: "upstream" };
  }

  if (!res.ok) {
    console.error("Supabase sign failed", res.status, await res.text().catch(() => ""));
    return { ok: false, error: "upstream" };
  }

  // Supabase answers with a path plus token, not an absolute URL.
  const { url } = (await res.json()) as { url: string };
  return {
    ok: true,
    uploadUrl: `${sb.url}/storage/v1${url.startsWith("/") ? url : `/${url}`}`,
    publicUrl: `${sb.url}/storage/v1/object/public/${BUCKET}/${name}`,
    contentType,
  };
}

/** Whether a URL is one of ours, so a form cannot point a song at anything else. */
export function isOwnUpload(url: string): boolean {
  const sb = supabase();
  if (sb && url.startsWith(`${sb.url}/storage/v1/object/public/${BUCKET}/`)) return true;
  return /^\/media\/[a-f0-9]+\.[a-z0-9]+$/i.test(url);
}

export type SaveResult =
  | { ok: true; url: string }
  | { ok: false; error: "type" | "size" | "upstream" };

export async function saveUpload(
  file: File,
  kind: "audio" | "image",
): Promise<SaveResult> {
  const allowed = kind === "audio" ? AUDIO_TYPES : IMAGE_TYPES;
  const limit = kind === "audio" ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;

  // Trust the sniffed type over the filename: the extension is attacker-controlled.
  if (!allowed.has(file.type)) return { ok: false, error: "type" };
  if (file.size > limit) return { ok: false, error: "size" };

  // Our own name, so nothing from the upload reaches a path or a URL.
  const name = `${randomBytes(12).toString("hex")}${EXT[file.type] ?? ""}`;
  const sb = supabase();

  if (sb) {
    // fetch throws on a connection failure rather than returning a response, so
    // a Supabase blip has to be caught here — otherwise it escapes the action
    // and Yazan gets a crash page instead of "try again".
    let res: Response;
    try {
      res = await fetch(`${sb.url}/storage/v1/object/${BUCKET}/${name}`, {
        method: "POST",
        headers: {
          // Both headers, because Supabase has two key formats in circulation:
          // the legacy service_role JWT and the newer sb_secret_… keys. The
          // legacy one is accepted as a bearer token; the new one is expected in
          // apikey. Sending both means either key works.
          apikey: sb.key,
          Authorization: `Bearer ${sb.key}`,
          "Content-Type": file.type,
          "Cache-Control": "31536000",
        },
        body: file,
      });
    } catch (err) {
      console.error("Supabase upload unreachable", err);
      return { ok: false, error: "upstream" };
    }
    if (!res.ok) {
      console.error(
        "Supabase upload failed",
        res.status,
        await res.text().catch(() => ""),
      );
      return { ok: false, error: "upstream" };
    }
    return {
      ok: true,
      url: `${sb.url}/storage/v1/object/public/${BUCKET}/${name}`,
    };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, name),
    Buffer.from(await file.arrayBuffer()),
  );
  return { ok: true, url: `/media/${name}` };
}

/** Removes a previously saved file, whichever backend holds it. */
export async function deleteUpload(url: string | null): Promise<void> {
  if (!url) return;
  const sb = supabase();

  if (sb && url.startsWith(`${sb.url}/storage/v1/object/public/${BUCKET}/`)) {
    const name = url.split("/").pop()!;
    await fetch(`${sb.url}/storage/v1/object/${BUCKET}/${name}`, {
      method: "DELETE",
      headers: { apikey: sb.key, Authorization: `Bearer ${sb.key}` },
    }).catch(() => {});
    return;
  }

  if (!url.startsWith("/media/")) return;
  const name = url.slice("/media/".length);
  if (!/^[a-f0-9]+\.[a-z0-9]+$/i.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}
