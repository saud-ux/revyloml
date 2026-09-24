"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSong, deleteSong, getSong, newSlug, reorderSongs, setPinned,
  setVisibility, updateProfile, updateSong, type SongInput,
} from "@/lib/data";
import { adminConfigured, checkAdminPassword, createSession, destroySession, isSignedIn } from "@/lib/auth";
import { deleteUpload, saveUpload } from "@/lib/storage";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n";
import type { Visibility } from "@/lib/types";

/**
 * Every action re-checks the session. The admin layout also guards the pages,
 * but a server action is its own HTTP endpoint — guarding only the page that
 * renders the form would leave the endpoint open.
 */
async function requireAdmin(): Promise<void> {
  if (!(await isSignedIn())) throw new Error("Not signed in");
}

function localeFrom(value: FormDataEntryValue | null): Locale {
  const v = String(value ?? "");
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

export type FormState = { error?: string } | undefined;

// ---------------------------------------------------------------- session

export async function signIn(_prev: FormState, form: FormData): Promise<FormState> {
  const locale = localeFrom(form.get("locale"));
  const password = String(form.get("password") ?? "");

  if (!adminConfigured()) {
    return { error: "This deployment has no admin password set (ADMIN_PASSWORD or ADMIN_PASSWORD_HASH, plus SESSION_SECRET)." };
  }
  if (!(await checkAdminPassword(password))) {
    // One message for a wrong password and for a missing one: nothing to probe.
    return { error: "wrong" };
  }
  await createSession();
  redirect(`/${locale}/admin`);
}

export async function signOut(form: FormData): Promise<void> {
  const locale = localeFrom(form.get("locale"));
  await destroySession();
  redirect(`/${locale}`);
}

// ---------------------------------------------------------------- songs

async function readSongForm(form: FormData, existingAudio: string | null, existingCover: string | null) {
  const audio = form.get("audio");
  const cover = form.get("cover");
  let audioUrl = existingAudio;
  let coverUrl = existingCover;

  if (audio instanceof File && audio.size > 0) {
    const saved = await saveUpload(audio, "audio");
    if (!saved.ok) return { error: saved.error === "size" ? "audio-size" : "audio-type" } as const;
    await deleteUpload(existingAudio);
    audioUrl = saved.url;
  }
  if (cover instanceof File && cover.size > 0) {
    const saved = await saveUpload(cover, "image");
    if (!saved.ok) return { error: saved.error === "size" ? "cover-size" : "cover-type" } as const;
    await deleteUpload(existingCover);
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
  await requireAdmin();
  const locale = localeFrom(form.get("locale"));
  const slug = String(form.get("slug") ?? "");
  const existing = slug ? await getSong(slug) : null;

  const result = await readSongForm(form, existing?.audioUrl ?? null, existing?.coverUrl ?? null);
  if ("error" in result) return { error: result.error };

  if (existing) await updateSong(slug, result.input);
  else await createSong(newSlug(), result.input);

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin`);
}

export async function removeSong(form: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(form.get("slug") ?? "");
  const song = await deleteSong(slug);
  // Delete the files only after the row is gone, so a failure never leaves a
  // song pointing at audio that no longer exists.
  await deleteUpload(song?.audioUrl ?? null);
  await deleteUpload(song?.coverUrl ?? null);
  revalidatePath("/", "layout");
}

export async function toggleVisibility(form: FormData): Promise<void> {
  await requireAdmin();
  const slug = String(form.get("slug") ?? "");
  await setVisibility(slug, form.get("visibility") === "hidden" ? "hidden" : "public");
  revalidatePath("/", "layout");
}

export async function togglePinned(form: FormData): Promise<void> {
  await requireAdmin();
  await setPinned(String(form.get("slug") ?? ""), form.get("pinned") === "true");
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
  let photoUrl = String(form.get("photoUrl") ?? "") || null;

  if (photo instanceof File && photo.size > 0) {
    const saved = await saveUpload(photo, "image");
    if (!saved.ok) return { error: saved.error === "size" ? "photo-size" : "photo-type" };
    await deleteUpload(photoUrl);
    photoUrl = saved.url;
  }

  await updateProfile({
    name: { ar: String(form.get("nameAr") ?? "").trim(), en: String(form.get("nameEn") ?? "").trim() },
    bio: { ar: String(form.get("bioAr") ?? "").trim(), en: String(form.get("bioEn") ?? "").trim() },
    photoUrl,
    accent: /^#[0-9a-f]{6}$/i.test(String(form.get("accent"))) ? String(form.get("accent")) : "#1DB954",
  });

  revalidatePath("/", "layout");
  redirect(`/${locale}/admin`);
}
