import { timingSafeEqual } from "node:crypto";
import { isSignedIn } from "@/lib/auth";
import { createSnapshot, storeSnapshot } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * Takes a snapshot and files it. Meant for a weekly scheduler, so it accepts a
 * token as well as an admin session: a cron service has no cookies.
 */
function tokenOk(given: string | null): boolean {
  const expected = process.env.BACKUP_TOKEN;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: Request): Promise<Response> {
  const token = new URL(request.url).searchParams.get("token")
    ?? request.headers.get("x-backup-token");

  if (!tokenOk(token) && !(await isSignedIn())) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const name = await storeSnapshot(await createSnapshot());
    return Response.json({ ok: true, name });
  } catch (err) {
    console.error("backup failed", err);
    return Response.json({ ok: false, error: "failed" }, { status: 500 });
  }
}

// GET as well as POST: most scheduling services only send GET.
export const GET = run;
export const POST = run;
