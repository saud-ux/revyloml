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
  /** how many times it has been started */
  plays: number;
  /** who touched it last, and when, since two people share the admin */
  updatedAt: string | null;
  updatedBy: string;
};

/** Handles, not URLs: the address is built from them so it always points home. */
export type Social = {
  instagram: string;
  tiktok: string;
  snapchat: string;
  x: string;
};

export type Profile = {
  handle: string;
  name: Localized;
  bio: Localized;
  photoUrl: string | null;
  accent: string;
  social: Social;
};
