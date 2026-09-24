import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Uploaded audio and cover art live on disk, served back through /media.
 *
 * On Render that directory must be a persistent disk — the container filesystem
 * is wiped on every deploy. Set UPLOAD_DIR to the disk's mount path.
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), ".uploads");

const AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/aac"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXT: Record<string, string> = {
  "audio/mpeg": ".mp3", "audio/mp3": ".mp3", "audio/wav": ".wav", "audio/x-wav": ".wav",
  "audio/mp4": ".m4a", "audio/x-m4a": ".m4a", "audio/aac": ".aac",
  "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif",
};

export type SaveResult = { ok: true; url: string } | { ok: false; error: "type" | "size" };

export async function saveUpload(file: File, kind: "audio" | "image"): Promise<SaveResult> {
  const allowed = kind === "audio" ? AUDIO_TYPES : IMAGE_TYPES;
  const limit = kind === "audio" ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;

  // Trust the sniffed type over the filename: the extension is attacker-controlled.
  if (!allowed.has(file.type)) return { ok: false, error: "type" };
  if (file.size > limit) return { ok: false, error: "size" };

  // Our own name, so nothing from the upload reaches the filesystem path.
  const name = `${randomBytes(12).toString("hex")}${EXT[file.type] ?? ""}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return { ok: true, url: `/media/${name}` };
}

/** Removes a previously saved file. Anything not under /media is ignored. */
export async function deleteUpload(url: string | null): Promise<void> {
  if (!url?.startsWith("/media/")) return;
  const name = url.slice("/media/".length);
  if (!/^[a-f0-9]+\.[a-z0-9]+$/i.test(name)) return;
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
}
