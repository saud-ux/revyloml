import "server-only";
import songsSeed from "../../data/songs.json";
import profileSeed from "../../data/profile.json";
import type { Profile, Song } from "./types";

/**
 * The only place the app reads content from.
 *
 * Today it serves a seeded JSON file so the site runs with no backend. When the
 * backend lands, replace the four function bodies below — every caller is
 * already async and nothing else in the app touches storage.
 */

const songs = songsSeed as Song[];
const profile = profileSeed as Profile;

const byPosition = (a: Song, b: Song) => a.position - b.position;

/** Songs listed on the public page. Hidden songs are deliberately excluded. */
export async function listPublicSongs(): Promise<Song[]> {
  return songs.filter((s) => s.visibility === "public").sort(byPosition);
}

/**
 * Resolves a shared link. Hidden songs ARE returned here — that is the whole
 * point of "hidden": off the list, reachable by direct link.
 */
export async function getSong(slug: string): Promise<Song | null> {
  return songs.find((s) => s.slug === slug) ?? null;
}

export async function getFeaturedSong(): Promise<Song | null> {
  const pub = await listPublicSongs();
  return pub.find((s) => s.pinned) ?? pub[0] ?? null;
}

export async function getProfile(): Promise<Profile> {
  return profile;
}
