import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/storage";

const TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".aac": "audio/aac",
  ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif",
};

/**
 * Serves uploaded files, with Range support so phones can seek inside a track
 * instead of downloading the whole thing first.
 */
export async function GET(req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  // The name pattern is the only thing standing between a URL and the filesystem.
  if (!/^[a-f0-9]{24}\.[a-z0-9]{3,4}$/i.test(name)) {
    return new Response("Not found", { status: 404 });
  }

  const file = path.join(UPLOAD_DIR, name);
  let size: number;
  try {
    size = statSync(file).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const type = TYPES[path.extname(name).toLowerCase()] ?? "application/octet-stream";
  const headers: Record<string, string> = {
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  };

  const range = req.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (match) {
    const start = match[1] ? Number(match[1]) : 0;
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { status: 200, headers: { ...headers, "Content-Length": String(size) } });
}
