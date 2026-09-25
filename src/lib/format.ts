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

/**
 * Arabic counts in more than two shapes, and getting it wrong is the kind of
 * thing a native reader notices immediately: one is the bare noun, two has its
 * own dual form, three to ten take the plural, and eleven upwards goes back to
 * the singular. English only ever needs the last two of these.
 */
export function arabicCount(
  n: number,
  forms: { one: string; two: string; few: string; many: string },
): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

const AR_UNITS = {
  minute: { one: "دقيقة", two: "دقيقتين", few: "دقائق", many: "دقيقة" },
  hour: { one: "ساعة", two: "ساعتين", few: "ساعات", many: "ساعة" },
  day: { one: "يوم", two: "يومين", few: "أيام", many: "يوم" },
} as const;

/**
 * How long ago, in words, for the admin list. Rounded hard on purpose: two
 * people sharing one admin need to know roughly when, not exactly.
 */
export function ago(iso: string, locale: Locale): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  const ar = locale === "ar";
  if (seconds < 90) return ar ? "الآن" : "just now";

  const scales = [
    { limit: 3600, per: 60, unit: "minute", en: "min" },
    { limit: 86400, per: 3600, unit: "hour", en: "h" },
    { limit: 86400 * 30, per: 86400, unit: "day", en: "d" },
  ] as const;

  for (const { limit, per, unit, en } of scales) {
    if (seconds >= limit) continue;
    const n = Math.max(1, Math.round(seconds / per));
    return ar ? `قبل ${arabicCount(n, AR_UNITS[unit])}` : `${n}${en} ago`;
  }
  return ar ? "من زمان" : "a while ago";
}

const AR_THINGS = {
  song: { one: "أغنية", two: "أغنيتين", few: "أغاني", many: "أغنية" },
  play: { one: "تشغيل", two: "تشغيلين", few: "تشغيلات", many: "تشغيل" },
} as const;

/**
 * Counted nouns, in whichever language is reading.
 *
 * These were templates in the dictionary, "{n} أغنية", which produced "2 أغنية"
 * where Arabic wants "أغنيتين". A template cannot express that and the
 * dictionary cannot hold a function, because a function cannot cross into a
 * client component, so the phrase is assembled here instead.
 */
export function songCount(n: number, locale: Locale): string {
  if (locale === "en") return n === 1 ? "1 song" : `${n} songs`;
  return arabicCount(n, AR_THINGS.song);
}

export function playCount(n: number, locale: Locale): string {
  if (locale === "en") return n === 1 ? "1 play" : `${n} plays`;
  return arabicCount(n, AR_THINGS.play);
}
