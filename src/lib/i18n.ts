export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

export const dir = (l: Locale) => (l === "ar" ? "rtl" : "ltr");
export const other = (l: Locale): Locale => (l === "ar" ? "en" : "ar");

const dict = {
  ar: {
    songs: "الأغاني",
    nSongs: "{n} أغنية",
    sharePage: "شارك صفحتي",
    share: "مشاركة",
    shareSong: "شارك هذه الأغنية",
    shuffle: "عشوائي",
    pinned: "مثبّتة",
    newest: "الأحدث أولاً",
    back: "رجوع",
    play: "تشغيل",
    pause: "إيقاف مؤقت",
    prev: "الأغنية السابقة",
    next: "الأغنية التالية",
    nowPlaying: "يُشغَّل الآن",
    lyrics: "الكلمات",
    moreBy: "المزيد من أغاني {name}",
    copyLink: "نسخ الرابط",
    copied: "تم نسخ الرابط",
    whatsapp: "واتساب",
    moreApps: "تطبيقات أخرى",
    cancel: "إلغاء",
    noAudio: "ما في ملف صوتي بعد",
    emptyTitle: "لسّا ما في شي",
    emptyBody: "هالصفحة مستنية أول أغنية. خذ وقتك — رح تكون هون لما تجهز.",
    notFoundTitle: "الأغنية مش موجودة",
    notFoundBody: "يمكن تكون انحذفت، أو في حرف ناقص بالرابط.",
    goHome: "روح للصفحة الرئيسية",
    switchLang: "التبديل إلى الإنجليزية",
    langLabel: "EN",
    loading: "جارٍ التحميل",
  },
  en: {
    songs: "Songs",
    nSongs: "{n} songs",
    sharePage: "Share my page",
    share: "Share",
    shareSong: "Share this song",
    shuffle: "Shuffle",
    pinned: "Pinned",
    newest: "Newest first",
    back: "Back",
    play: "Play",
    pause: "Pause",
    prev: "Previous song",
    next: "Next song",
    nowPlaying: "Now playing",
    lyrics: "Lyrics",
    moreBy: "More songs by {name}",
    copyLink: "Copy link",
    copied: "Link copied",
    whatsapp: "WhatsApp",
    moreApps: "More apps",
    cancel: "Cancel",
    noAudio: "No audio file yet",
    emptyTitle: "Nothing here yet",
    emptyBody: "This page is waiting for its first song. Take your time — it'll be here when you're ready.",
    notFoundTitle: "This song isn't here",
    notFoundBody: "It may have been removed, or the link is off by a character.",
    goHome: "Go to the home page",
    switchLang: "Switch to Arabic",
    langLabel: "ع",
    loading: "Loading",
  },
} as const;

export type Dict = (typeof dict)["en"];
export const t = (l: Locale): Dict => dict[l] as unknown as Dict;

/**
 * Dictionary values are plain strings with {placeholders} rather than functions,
 * because a dictionary crosses the server/client boundary and functions cannot.
 */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => String(vars[k] ?? m));
}
