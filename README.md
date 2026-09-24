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
- No backend yet. See *Data* below.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000 -> redirects to /ar
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint
```

## Routing

| Path | What it is |
| --- | --- |
| `/` | redirects to the default locale (`/ar`) |
| `/ar`, `/en` | home / profile: pinned song plus the song list |
| `/ar/s/<slug>` | a song page — this is what a shared link points at |

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

**Audio files.** `audioUrl` is `null` for every seeded song, so play controls
render disabled with a reason ("no audio file yet"). Drop an mp3 in
`public/audio/` and point `audioUrl` at it to hear it. The player handles a
missing file rather than pretending.

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

- Admin: login, dashboard (reorder / hide / pin / delete), upload form. Designed,
  not implemented — it needs an auth and storage decision first.
- Profile settings (photo, bilingual name and bio, accent colour).
- A generated Open Graph image for song links.
- `HomeSkeleton` is written but not wired as `loading.tsx`; see the note in that
  file for why that has to wait until data moves behind the network.
