"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSong, deleteSong, getSong, newSlug, reorderSongs, setPinned,
  setVisibility, updateProfile, updateSong, type SongInput,
} from "@/lib/data";
import { adminConfigured, checkAdminPassword, createSession, currentAdmin, destroySession } from "@/lib/auth";
import { checkLoginAttempt, clearLoginAttempts } from "@/lib/ratelimit";
import { headers } from "next/headers";
import { createUploadTicket, deleteUpload, isOwnUpload, saveUpload, type Ticket } from "@/lib/storage";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import type { Visibility } from "@/lib/types";

/** Matches --accent in tokens.css, which is what the site actually renders. */
const ACCENT = "#1DB954";

/**
 * Every action re-checks the session. The admin layout also guards the pages,
 * but a server action is its own HTTP endpoint — guarding only the page that
 * renders the form would leave the endpoint open.
 */
async function requireAdmin(): Promise<string> {
  const who = await currentAdmin();
  if (!who) throw new Error("Not signed in");
  return who;
}

function localeFrom(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export type FormState = { error?: string; retryAfterSeconds?: number } | undefined;

// ---------------------------------------------------------------- session

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeFrom(form.get("locale"));
  const password = String(form.get("password") ?? "");

  if (!adminConfigured()) {
    return { error: "This deployment has no admin password set (ADMIN_PASSWORD or ADMIN_PASSWORD_HASH, plus SESSION_SECRET)." };
  }

  // Behind a proxy the socket address is Render's, so the forwarded address is
  // the only thing that distinguishes callers. It can be spoofed, which caps
  // what this is worth: it slows down a guesser, it does not stop a determined
  // one. Everything falls into one shared bucket if the header is missing.
  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || "unknown";

  const limit = checkLoginAttempt(ip);
  if (!limit.allowed) return { error: "rate", retryAfterSeconds: limit.retryAfterSeconds };

  const who = await checkAdminPassword(password);
  if (!who) {
    // One message for a wrong password and for a missing one: nothing to probe.
    return { error: "wrong" };
  }

  clearLoginAttempts(ip);
  await createSession(who);
  redirect(`/${locale}/admin`);
}

export async function signOut(form: FormData): Promise<void> {
  const locale = localeFrom(form.get("locale"));
  await destroySession();
  redirect(`/${locale}`);
}

// ---------------------------------------------------------------- uploads

/**
 * Hands the browser a signed URL so it can put a file into the bucket itself.
 * Carries no file, so it is nowhere near the 1 MB action body limit that was
 * rejecting every upload.
 */
export async function requestUpload(
  kind: "audio" | "image",
  contentType: string,
  size: number,
): Promise<Ticket> {
  await requireAdmin();
  return createUploadTicket(kind, contentType, size);
}

// ---------------------------------------------------------------- songs

async function readSongForm(form: FormData, existingAudio: string | null, existingCover: string | null) {
  const audio = form.get("audio");
  const cover = form.get("cover");
  let audioUrl = existingAudio;
  let coverUrl = existingCover;

  // The browser normally uploads straight to the bucket and sends back the URL
  // it landed on; only the disk backend still posts the file itself.
  const audioDone = String(form.get("audioUrl") ?? "");
  const coverDone = String(form.get("coverUrl") ?? "");
  if (audioDone && isOwnUpload(audioDone) && audioDone !== existingAudio) {
    await deleteUpload(existingAudio);
    audioUrl = audioDone;
  }
  if (coverDone && isOwnUpload(coverDone) && coverDone !== existingCover) {
    await deleteUpload(existingCover);
    coverUrl = coverDone;
  }

  if (audio instanceof File && audio.size > 0) {
    const saved = await saveUpload(audio, "audio");
    if (!saved.ok) return { error: `audio-${saved.error}` } as const;
    await deleteUpload(audioUrl);
    audioUrl = saved.url;
  }
  if (cover instanceof File && cover.size > 0) {
    const saved = await saveUpload(cover, "image");
    if (!saved.ok) return { error: `cover-${saved.error}` } as const;
    await deleteUpload(coverUrl);
    coverUrl = saved.url;
  }

  const titleAr = String(form.get("titleAr") ?? "").trim();
  const titleEn = String(form.get("titleEn") ?? "").trim() || titleAr;
  if (!titleAr) return { error: "title" } as const;

  const input: SongInput = {
    title: { ar: titleAr, en: titleEn },
    releasedAt: String(form.get("releasedAt") || new Date().toISOString().slice(0, 10)),
    duration: Math.max(0, Math.round(Number(form.get("duration")) || 0)),
    audioUrl,
    coverUrl,
    lyrics: String(form.get("lyrics") ?? "").trim(),
    visibility: (form.get("visibility") === "hidden" ? "hidden" : "public") as Visibility,
  };
  return { input } as const;
}

export async function saveSong(_prev: FormState, form: FormData): Promise<FormState> {
  const who = await requireAdmin();
  const locale = localeFrom(form.get("locale"));
  const slug = String(form.get("slug") ?? "");
  const existing = slug ? await getSong(slug) : null;

  const result = await readSongForm(form, existing?.audioUrl ?? null, existing?.coverUrl ?? null);
  if ("error" in result) return { error: result.error };

  if (existing) await updateSong(slug, result.input, who);
  else await createSong(newSlug(), result.input, who);

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin`);
}

export async function removeSong(slug: string): Promise<void> {
  await requireAdmin();
  const song = await deleteSong(slug);
  // Delete the files only after the row is gone, so a failure never leaves a
  // song pointing at audio that no longer exists.
  await deleteUpload(song?.audioUrl ?? null);
  await deleteUpload(song?.coverUrl ?? null);
  revalidatePath("/", "layout");
}

export async function toggleVisibility(slug: string, visibility: Visibility): Promise<void> {
  const who = await requireAdmin();
  await setVisibility(slug, visibility === "hidden" ? "hidden" : "public", who);
  revalidatePath("/", "layout");
}

export async function togglePinned(slug: string, pinned: boolean): Promise<void> {
  const who = await requireAdmin();
  await setPinned(slug, pinned, who);
  revalidatePath("/", "layout");
}

export async function saveOrder(slugs: string[]): Promise<void> {
  await requireAdmin();
  await reorderSongs(slugs);
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- profile

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const locale = localeFrom(form.get("locale"));
  const photo = form.get("photo");
  const existingPhoto = String(form.get("photoUrl") ?? "") || null;
  let photoUrl = existingPhoto;

  const photoDone = String(form.get("photoUploaded") ?? "");
  if (photoDone && isOwnUpload(photoDone) && photoDone !== existingPhoto) {
    await deleteUpload(existingPhoto);
    photoUrl = photoDone;
  }

  if (photo instanceof File && photo.size > 0) {
    const saved = await saveUpload(photo, "image");
    if (!saved.ok) return { error: `photo-${saved.error}` };
    await deleteUpload(photoUrl);
    photoUrl = saved.url;
  }

  // Lowercase letters, digits, dot and underscore: it has to survive being read
  // aloud and typed into a URL.
  const handle = String(form.get("handle") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) return { error: "handle" };

  // Stored as bare handles: a leading @ or a whole pasted profile address are
  // both trimmed down to the name, so the link built from it always points at
  // the right place whatever he typed.
  const handleOf = (field: string) =>
    String(form.get(field) ?? "")
      .trim()
      .replace(/^https?:\/\/[^/]+\//i, "")
      .replace(/^@/, "")
      .replace(/\/.*$/, "")
      .slice(0, 40);

  await updateProfile({
    handle,
    name: { ar: String(form.get("nameAr") ?? "").trim(), en: String(form.get("nameEn") ?? "").trim() },
    bio: { ar: String(form.get("bioAr") ?? "").trim(), en: String(form.get("bioEn") ?? "").trim() },
    photoUrl,
    // One accent, and no longer a choice: the picker offered three colours and
    // changed nothing but the link preview images, because the site's green is
    // a CSS token the stored value was never wired to. Rather than wire up a
    // setting nobody asked for, the lie is gone and the colour is the token.
    accent: ACCENT,
    social: {
      instagram: handleOf("instagram"),
      tiktok: handleOf("tiktok"),
      snapchat: handleOf("snapchat"),
      x: handleOf("x"),
    },
  });

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin`);
}
