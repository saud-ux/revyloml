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

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".uploads");
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
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
  "audio/mp4", "audio/x-m4a", "audio/aac", "audio/ogg",
]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXT: Record<string, string> = {
  "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav",
  "audio/mp4": ".m4a", "audio/x-m4a": ".m4a", "audio/aac": ".aac", "audio/ogg": ".ogg",
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif",
};

export type SaveResult = { ok: true; url: string } | { ok: false; error: "type" | "size" | "upstream" };

export async function saveUpload(file: File, kind: "audio" | "image"): Promise<SaveResult> {
  const allowed = kind === "audio" ? AUDIO_TYPES : IMAGE_TYPES;
  const limit = kind === "audio" ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;

  // Trust the sniffed type over the filename: the extension is attacker-controlled.
  if (!allowed.has(file.type)) return { ok: false, error: "type" };
  if (file.size > limit) return { ok: false, error: "size" };

  // Our own name, so nothing from the upload reaches a path or a URL.
  const name = `${randomBytes(12).toString("hex")}${EXT[file.type] ?? ""}`;
  const sb = supabase();

  if (sb) {
    const res = await fetch(`${sb.url}/storage/v1/object/${BUCKET}/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sb.key}`,
        "Content-Type": file.type,
        "Cache-Control": "31536000",
      },
      body: file,
    });
    if (!res.ok) {
      console.error("Supabase upload failed", res.status, await res.text().catch(() => ""));
      return { ok: false, error: "upstream" };
    }
    return { ok: true, url: `${sb.url}/storage/v1/object/public/${BUCKET}/${name}` };
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
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
      headers: { Authorization: `Bearer ${sb.key}` },
    }).catch(() => {});
    return;
  }

  if (!url.startsWith("/media/")) return;
  const name = url.slice("/media/".length);
  if (!/^[a-f0-9]+\.[a-z0-9]+$/i.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}
