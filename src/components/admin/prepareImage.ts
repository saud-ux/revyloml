"use client";

/**
 * Shrinks a picture before it is uploaded.
 *
 * A photo straight off a phone is three or four megabytes and several thousand
 * pixels across. It is shown here at 84 pixels. Every listener downloads the
 * full thing on every visit, out of a free allowance of 10 GB a month, and the
 * bucket it sits in holds 1 GB in total.
 *
 * Drawing it through a canvas also normalises the format: whatever came in
 * leaves as JPEG, so a picture the browser could open but not everyone can
 * display does not end up as somebody's cover.
 */

/** Covers are square and small on screen; this is generous for a retina crop. */
const MAX_SIDE = 1200;
const QUALITY = 0.86;
/** Below this it is not worth re-encoding and risking a larger file. */
const LEAVE_ALONE = 220 * 1024;

export type PreparedImage = { file: File; shrunk: boolean };

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size <= LEAVE_ALONE && file.type === "image/jpeg") {
    return { file, shrunk: false };
  }

  try {
    // from-image so a photo taken sideways is not uploaded sideways: the
    // orientation lives in EXIF, and drawing it by hand would lose it.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { file, shrunk: false };
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY),
    );
    // Keep the original if the re-encode somehow came out bigger.
    if (!blob || blob.size >= file.size) return { file, shrunk: false };

    const name = file.name.replace(/\.[^./\\]+$/, "") || "cover";
    return { file: new File([blob], `${name}.jpg`, { type: "image/jpeg" }), shrunk: true };
  } catch {
    // An image the browser cannot decode is left to the checks upstream, which
    // already report an unsupported picture properly.
    return { file, shrunk: false };
  }
}
