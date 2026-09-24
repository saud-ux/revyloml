import type { Locale } from "./i18n";

/** 228 -> "3:48". Always m:ss so the column never changes width. */
export function duration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** ISO date -> "March 2026" / "مارس 2026". Western digits in both locales. */
export function monthYear(iso: string, locale: Locale): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
    numberingSystem: "latn",
  }).format(d);
}

/**
 * The auto-generated fallback cover: a deterministic tint plus the title's first
 * character. Same title always gets the same tile, in any language.
 */
const TINTS = ["#2e2a33", "#332a24", "#243230", "#33262a", "#25293a", "#332e22"];

export function coverTint(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}

export function coverLetter(title: string): string {
  return [...title.trim()][0] ?? "?";
}
