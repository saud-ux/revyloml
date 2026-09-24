import { getSong, recordPlay } from "@/lib/data";

/**
 * Called by the player when a song starts. Anyone can call it, which is the
 * nature of a play count on a public page; the slug is checked so it can only
 * ever increment a song that exists.
 */
export async function POST(request: Request) {
  let slug: unknown;
  try {
    ({ slug } = await request.json());
  } catch {
    return new Response(null, { status: 400 });
  }

  if (typeof slug !== "string" || !/^[a-z0-9]{1,16}$/.test(slug)) {
    return new Response(null, { status: 400 });
  }

  const song = await getSong(slug);
  if (!song) return new Response(null, { status: 404 });

  await recordPlay(slug);
  return new Response(null, { status: 204 });
}
