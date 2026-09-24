import { isSignedIn } from "@/lib/auth";
import { createSnapshot, readSnapshot, snapshotName } from "@/lib/backup";

export const dynamic = "force-dynamic";

/**
 * Hands a snapshot to the browser as a file. With no name it takes a fresh one,
 * which is the copy that ends up somewhere other than this project.
 *
 * Session only: a token is fine for asking the server to file a backup, not for
 * handing someone the contents.
 */
export async function GET(request: Request) {
  if (!(await isSignedIn())) return new Response("Not signed in", { status: 401 });

  const name = new URL(request.url).searchParams.get("name");

  if (name) {
    const body = await readSnapshot(name);
    if (!body) return new Response("Not found", { status: 404 });
    return new Response(body, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${name}"`,
      },
    });
  }

  const snapshot = await createSnapshot();
  return new Response(JSON.stringify(snapshot, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${snapshotName(snapshot.takenAt)}"`,
    },
  });
}
