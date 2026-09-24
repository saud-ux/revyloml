/**
 * Keep-alive target. A free Render instance sleeps after ~15 minutes idle, so
 * an external pinger hits this every 10.
 *
 * Deliberately touches nothing — no database, no disk. Pointing a 24/7 pinger
 * at a real page would spend the database's free-tier budget on nobody.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, at: new Date().toISOString() });
}
