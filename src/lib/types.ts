import type { Locale } from "./i18n";

export type Localized = Record<Locale, string>;

export type Visibility = "public" | "hidden";

export type Song = {
  slug: string;
  title: Localized;
  releasedAt: string;
  /** seconds; 0 when unknown */
  duration: number;
  audioUrl: string | null;
  coverUrl: string | null;
  lyrics: string;
  visibility: Visibility;
  pinned: boolean;
  position: number;
};

export type Profile = {
  handle: string;
  name: Localized;
  bio: Localized;
  photoUrl: string | null;
  accent: string;
};
