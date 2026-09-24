import { hasDatabase } from "@/lib/db";
import { getProfile } from "@/lib/data";

/**
 * Keep-alive target, in two depths.
 *
 *   /api/health         touches nothing. For the frequent pinger that stops a
 *                       free Render instance sleeping after ~15 minutes idle.
 *                       Deliberately free of database work: a 24/7 pinger
 *                       against a real page would spend the database's whole
 *                       free-tier budget on nobody.
 *
 *   /api/health?deep=1  runs one trivial query. Supabase pauses a free project
 *                       after about a week with no database activity, and the
 *                       shallow ping above would never wake it — so the site
 *                       could quietly die during a quiet month. Schedule this
 *                       one once a day.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const deep = new URL(request.url).searchParams.get("deep");
  const body: Record<string, unknown> = { ok: true, at: new Date().toISOString() };

  if (deep) {
    body.database = hasDatabase() ? "checking" : "none";
    if (hasDatabase()) {
      try {
        await getProfile();
        body.database = "up";
      } catch (err) {
        body.ok = false;
        body.database = "down";
        console.error("health: database unreachable", err);
        return Response.json(body, { status: 503 });
      }
    }
  }

  return Response.json(body);
}
