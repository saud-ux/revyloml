# revyloml

A personal music page for Yazan: he uploads songs here and shares links with people.
Dark, bilingual (Arabic RTL / English LTR), mobile-first — most visitors open a
shared link on a phone from WhatsApp or Instagram.

## Design

The design is a canvas of artboards, **Direction B ("Signal")** — flat, green,
square-cornered, no glow. `src/styles/tokens.css` is the single source of truth
for its values; change a colour, radius or spacing step there and nowhere else.

A second direction ("Ember", warm amber with a cover glow) was designed and
rejected. It is not in this repo and should not be reintroduced piecemeal.

## Stack

- **Next.js 16** (App Router) — shared links need server-rendered `og:` tags so
  the preview card is right in WhatsApp. That requirement drove the framework
  choice more than anything else.
- **TypeScript**, plain CSS with custom properties. No CSS framework: the design
  system is small and logical properties (`inset-inline`, `padding-inline`) give
  RTL for free from one stylesheet.
- **Postgres** over `DATABASE_URL` — the same variable works for Render Postgres
  and for Supabase, so the hosting choice stays open.
- Uploaded files on **Supabase Storage** or a local disk, whichever the
  environment configures. The disk path is served through a Range-capable route
  so phones can seek inside a track.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000 -> redirects to /ar
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint
```

With no environment at all it runs read-only off the JSON seed. To edit content
locally, copy `.env.example` to `.env.local` and fill in `DATABASE_URL`,
`SESSION_SECRET` and `ADMIN_PASSWORD_HASH` (see below).

## Routing

| Path | What it is |
| --- | --- |
| `/` | redirects to the default locale (`/ar`) |
| `/ar`, `/en` | home / profile: pinned song plus the song list |
| `/ar/s/<slug>` | a song page — this is what a shared link points at |
| `/ar/login` | the admin sign-in — only Yazan uses it |
| `/ar/admin` | his song list: reorder, hide, pin, edit, delete |
| `/ar/admin/songs/new` | upload a song |
| `/ar/admin/profile` | photo, bilingual name and bio, accent colour |
| `/media/<file>` | uploaded audio and artwork, with HTTP Range support |
| `/api/plays` | records that a song started; called by the player |

Every public URL carries its locale, so a link shared in Arabic opens in Arabic
on someone else's phone, whatever their device says.

A visitor arriving without a locale (just the bare domain) gets the language
their browser asks for: Arabic if their device lists Arabic, English otherwise.
Most people who receive a link will not read Arabic unless their phone says they
do, and a page someone cannot read is worse than one in the wrong script for its
owner. `middleware.ts` handles both.

## Data

`src/lib/data.ts` is the only place the app reads content from. Today it serves
`data/songs.json` and `data/profile.json` so the site runs with no backend.
Every function is already `async`, so swapping in a real database means replacing
four function bodies and nothing else.

Two rules that live in the data layer and must survive that swap:

- `listPublicSongs()` excludes hidden songs, and takes the order: the sequence
  Yazan dragged them into (the default, because it is the one he controls) or
  newest first, which a visitor can pick from the page.
- `getSong()` returns them anyway — that is what "hidden" means here: off the
  list, reachable by direct link. The song page also marks hidden songs
  `noindex` so they never turn up in search.

The first boot against an empty database creates the schema and inserts the
profile row. **No songs are seeded.** An earlier version inserted placeholders
whenever the table was empty, which meant deleting every song brought them all
back on the next restart — and a free instance restarts every time it wakes from
sleep. Yazan starts from an empty page and adds his own.

**Audio files.** Songs uploaded through the admin get an `audioUrl` pointing at
`/media/…`. Seeded songs have none, so their play controls render disabled with
a reason ("no audio file yet") rather than pretending.

## Admin and auth

One person signs in, so there is no user table and no auth library: the password
lives in the environment and the session is an HMAC-signed, `httpOnly` cookie.

Set **one** of these:

- `ADMIN_PASSWORD` — the password itself, hashed at boot. No terminal needed,
  which is the point: this can be set up entirely from a hosting dashboard.
- `ADMIN_PASSWORD_HASH` — a scrypt hash, and it wins if both are set:

  ```bash
  npm run hash-password -- "your password"
  ```

The plain variable is weaker only against someone who can already read the
deployment's environment — and they can read `DATABASE_URL` too, so the
practical gap is small.

The login form allows 8 attempts per 15 minutes per address, and a success
clears the count so normal use never trips it. It is keyed on the forwarded
address, which can be spoofed: it slows a guesser down, it does not stop a
determined one.

The admin layout redirects unauthenticated visitors, **and every server action
re-checks the session independently** — a server action is its own HTTP
endpoint, so guarding only the page that renders the form would leave it open.

Uploads are checked against an allowlist of media types and a size limit, and
are written under a server-generated filename: nothing from the upload reaches
a filesystem path.

"At most one pinned song" is enforced by a partial unique index in the schema,
so pinning runs in a transaction — the unpin and the pin must not be seen apart.

## Deploying

`render.yaml` is a Blueprint: **New > Blueprint**, point it at this repo.

It is written for the **free** setup — a free Render web service, with Postgres
and file storage on Supabase's free tier. Neither of Render's own free
offerings can hold anything you want to keep: free Postgres expires after about
30 days, and free web instances get no persistent disk, so the container
filesystem (and every upload on it) is wiped on each deploy.

In Supabase first: create a project, create a **public** bucket named `media`,
then copy the connection string, the project URL and the `service_role` key into
`DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`. Render generates
`SESSION_SECRET` and asks you for `ADMIN_PASSWORD`.

### Reordering on a phone

Drag-to-reorder in the admin uses pointer events, not HTML5 drag and drop, which
does not fire on touch screens at all. The pointer listeners live on the window
rather than the handle: reordering moves the handle's own row in the DOM, which
drops its pointer capture, so an element-bound `pointerup` never arrives and the
new order is silently never saved. The arrow buttons stay regardless, because a
list you can only reorder by dragging is a list some people cannot reorder.

### Keeping it awake

Two scheduled pings, because two different things go to sleep.

| Ping | Every | Why |
| --- | --- | --- |
| `/api/health` | 10 minutes | A free Render instance sleeps after ~15 minutes idle, and the first person to open a shared link then waits about a minute. This route touches no database, so a 24/7 pinger costs nothing on the storage/database free tier. |
| `/api/health?deep=1` | 1 day | Supabase pauses a free project after about a week with no database activity. The shallow ping would never wake it, so a quiet month would take the site down. This one runs a single query. |

Any free scheduler works — cron-job.org, UptimeRobot, a GitHub Actions
schedule. One always-awake free service fits inside Render's monthly free
instance-hours; a second one would not.

### The paid setup instead

Set the service `plan` to `starter`, add a disk mounted at `/var/data`, set
`UPLOAD_DIR=/var/data/uploads`, and leave the `SUPABASE_*` storage variables
empty. Files then go to the disk, the service never sleeps, and no pinger is
needed.

## Playback

`src/player/PlayerProvider.tsx` owns the single `<audio>` element for the whole
app and is mounted by the locale layout, which Next keeps alive across client
navigations — that is what makes playback survive moving from the home page to a
song page. Every control in the tree (row covers, the full player, the mini
player) reads and writes that one piece of state.

## Bilingual notes

- Arabic never takes `letter-spacing` or `text-transform: uppercase` — tracking
  breaks the joins between letters and there is no case to raise. Tracked styles
  are scoped to `:lang(en)` in `tokens.css`.
- Latin strings inside Arabic copy (the handle, URLs, filenames) get `.ltr`,
  which isolates them so the bidi algorithm does not reorder the line.
- Directional icons (back, previous, next) carry `.flip`. Play, pause, share and
  upload never mirror.

## Link previews

Sharing a song or the page produces a card with artwork, rendered by
`opengraph-image.tsx` in each route.

**Those images carry no Arabic text, on purpose.** The renderer behind
`next/og` has no bidi and no Arabic shaping: it places glyphs left to right, so
an Arabic title comes back with its letters reversed. This was measured, not
assumed. Every platform that scrapes a link renders `og:title` and
`og:description` itself, with correct text layout, right beside the image, so
the title still appears in the preview. A single letter has no ordering to get
wrong, which is why the generated fallback tile is safe, and handles are
constrained to Latin characters.

The image URL has to be absolute, so the server needs to know its own address.
Render sets `RENDER_EXTERNAL_URL` by itself; set `SITE_URL` to override it for a
custom domain.

## Backups

Supabase's free plan takes none, so the app takes its own. A snapshot holds
titles, dates, lyrics, order, visibility and the profile; the audio and artwork
live in storage and are not copied, because losing the database is the failure
this guards against.

- **Weekly, automatic.** A scheduler calls `/api/backup?token=…` and a snapshot
  is filed in a private `backups` bucket, created on first use so nobody has to
  make it by hand. The newest eight are kept. The full URL, token included, is
  printed in the admin's Backups panel: it sits behind the login, and all it can
  do is ask the server to file a snapshot.
- **On demand.** A button in the same panel downloads a fresh snapshot. That is
  the copy that ends up somewhere other than this project, which matters:
  snapshots in the same Supabase project survive a bad delete, not the loss of
  the project itself.

## Play counts

The player posts to `/api/plays` when a track actually starts, not when a page
loads and not on every unpause. Counts are deliberately conservative: a song
started twice in one session counts once. They appear in the admin list only.

## Not built yet

- `HomeSkeleton` is written but not wired as `loading.tsx`; see the note in that
  file for why that has to wait until data moves behind the network.
- Audio duration is read in the browser at upload time. A file the browser
  cannot decode is stored with a duration of 0.
- Login rate limiting is per instance and in memory, so a restart clears it.
- Backups cover the database only. Audio and artwork are not copied anywhere.
