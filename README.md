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
- Uploaded files on disk, served through a Range-capable route so phones can
  seek inside a track.

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

Every public URL carries its locale, so a link shared in Arabic opens in Arabic
on someone else's phone. `middleware.ts` handles the redirect.

## Data

`src/lib/data.ts` is the only place the app reads content from. Today it serves
`data/songs.json` and `data/profile.json` so the site runs with no backend.
Every function is already `async`, so swapping in a real database means replacing
four function bodies and nothing else.

Two rules that live in the data layer and must survive that swap:

- `listPublicSongs()` excludes hidden songs.
- `getSong()` returns them anyway — that is what "hidden" means here: off the
  list, reachable by direct link. The song page also marks hidden songs
  `noindex` so they never turn up in search.

The first boot against an empty database creates the schema and seeds it from
`data/songs.json`. That seed only fires into an empty `songs` table, so it never
overwrites anything edited or deleted afterwards.

**Audio files.** Songs uploaded through the admin get an `audioUrl` pointing at
`/media/…`. Seeded songs have none, so their play controls render disabled with
a reason ("no audio file yet") rather than pretending.

## Admin and auth

One person signs in, so there is no user table and no auth library: a scrypt
hash of the password lives in `ADMIN_PASSWORD_HASH` and the session is an
HMAC-signed, `httpOnly` cookie.

```bash
npm run hash-password -- "your password"   # prints ADMIN_PASSWORD_HASH
```

The admin layout redirects unauthenticated visitors, **and every server action
re-checks the session independently** — a server action is its own HTTP
endpoint, so guarding only the page that renders the form would leave it open.

Uploads are checked against an allowlist of media types and a size limit, and
are written under a server-generated filename: nothing from the upload reaches
a filesystem path.

"At most one pinned song" is enforced by a partial unique index in the schema,
so pinning runs in a transaction — the unpin and the pin must not be seen apart.

## Deploying to Render

`render.yaml` is a Blueprint: **New > Blueprint**, point it at this repo. It
creates the web service and Postgres, wires `DATABASE_URL` and generates
`SESSION_SECRET`. You supply `ADMIN_PASSWORD_HASH` when prompted.

One thing worth knowing before you click: **the disk is not optional.** Uploaded
audio lives on it, and Render wipes the container filesystem on every deploy, so
without a disk every upload disappears the next time you deploy. Disks require a
paid instance type. If you would rather stay on free tiers, move `src/lib/storage.ts`
to object storage (S3, R2 or Supabase Storage) — it is one file with two
functions, and nothing else touches the filesystem.

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

## Not built yet

- A generated Open Graph image for song links: previews currently carry the
  title and date as text, with no artwork.
- Rate limiting on the login form. One password, no lockout — fine behind an
  obscure URL, worth adding if the link ever gets around.
- `HomeSkeleton` is written but not wired as `loading.tsx`; see the note in that
  file for why that has to wait until data moves behind the network.
- Audio duration is read in the browser at upload time. A file the browser
  cannot decode is stored with a duration of 0.
