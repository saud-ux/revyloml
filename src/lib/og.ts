import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { coverTint } from "./format";

/**
 * Shared pieces of the link-preview images.
 *
 * The fonts are read from disk once per process. They have to be real font
 * files: the image renderer has no system fonts, and without an Arabic face
 * every Arabic title comes out as empty boxes.
 */
let fonts: { regular: Buffer; semibold: Buffer } | null = null;

export async function ogFonts() {
  if (!fonts) {
    const dir = path.join(process.cwd(), "assets/fonts");
    const [regular, semibold] = await Promise.all([
      readFile(path.join(dir, "IBMPlexSansArabic-Regular.ttf")),
      readFile(path.join(dir, "IBMPlexSansArabic-SemiBold.ttf")),
    ]);
    fonts = { regular, semibold };
  }
  return fonts;
}

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const OG = {
  bg: "#0A0A0A",
  surface: "#141414",
  line: "#1F1F1F",
  text: "#FFFFFF",
  muted: "#A7A7A7",
  faint: "#7D7D7D",
};

export { coverTint };
