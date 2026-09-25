import "server-only";
import { headers } from "next/headers";

/**
 * What this deployment is reachable at, for the links the admin prints: the
 * public page, a song's share link, and the address a scheduler calls to take
 * a backup.
 *
 * Shared rather than worked out per page, because two pages doing this their
 * own way is how they end up disagreeing. The configured value wins where there
 * is one; otherwise the request says, and behind a proxy the forwarded headers
 * are the ones that carry the address a visitor actually typed.
 */
export async function siteOrigin(): Promise<string> {
  const configured = process.env.SITE_URL ?? process.env.RENDER_EXTERNAL_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host");
  const proto = head.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}
