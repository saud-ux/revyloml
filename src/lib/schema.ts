import "server-only";

/**
 * Applied on first use by `migrate()`. Kept as a string rather than a .sql file
 * read at runtime: the deployed bundle should not depend on source files still
 * sitting on disk next to it.
 */
export const SCHEMA = `
-- One artist, so no users table: the single admin is an env-var password hash.

CREATE TABLE IF NOT EXISTS profile (
  id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  handle      text NOT NULL DEFAULT 'revyloml',
  name_ar     text NOT NULL DEFAULT '',
  name_en     text NOT NULL DEFAULT '',
  bio_ar      text NOT NULL DEFAULT '',
  bio_en      text NOT NULL DEFAULT '',
  photo_url   text,
  accent      text NOT NULL DEFAULT '#1DB954'
);

CREATE TABLE IF NOT EXISTS songs (
  slug        text PRIMARY KEY,
  title_ar    text NOT NULL,
  title_en    text NOT NULL,
  released_at date NOT NULL,
  duration    integer NOT NULL DEFAULT 0,
  audio_url   text,
  cover_url   text,
  lyrics      text NOT NULL DEFAULT '',
  visibility  text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'hidden')),
  pinned      boolean NOT NULL DEFAULT false,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS songs_position_idx ON songs (position);

-- Added after the first deploy, so it has to be safe against an existing table.
ALTER TABLE songs ADD COLUMN IF NOT EXISTS plays integer NOT NULL DEFAULT 0;

-- Where else to find him. Each is stored as the handle alone, not a URL, so the
-- link is built here and a pasted address cannot point anywhere unexpected.
ALTER TABLE profile ADD COLUMN IF NOT EXISTS instagram text NOT NULL DEFAULT '';
ALTER TABLE profile ADD COLUMN IF NOT EXISTS tiktok    text NOT NULL DEFAULT '';
ALTER TABLE profile ADD COLUMN IF NOT EXISTS snapchat  text NOT NULL DEFAULT '';
ALTER TABLE profile ADD COLUMN IF NOT EXISTS x_handle  text NOT NULL DEFAULT '';

-- Two people share this admin, so a row remembers who touched it last.
ALTER TABLE songs ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE songs ADD COLUMN IF NOT EXISTS updated_by text NOT NULL DEFAULT '';

-- At most one pinned song: the featured slot on the home page holds one card.
CREATE UNIQUE INDEX IF NOT EXISTS songs_one_pinned_idx ON songs (pinned) WHERE pinned;
`;
