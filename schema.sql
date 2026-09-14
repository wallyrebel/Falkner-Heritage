-- Falkner Heritage — blog database (Cloudflare D1)
-- Apply with:  wrangler d1 execute falkner-blog --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS posts (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',
  hero_image_id TEXT,
  hero_alt      TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'draft',   -- draft | review | published
  author_email  TEXT NOT NULL,
  author_name   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  published_at  TEXT
);

CREATE INDEX IF NOT EXISTS posts_status_published
  ON posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS posts_author
  ON posts (author_email, updated_at DESC);

CREATE TABLE IF NOT EXISTS images (
  id          TEXT PRIMARY KEY,
  mime        TEXT NOT NULL,
  bytes       BLOB NOT NULL,
  width       INTEGER NOT NULL DEFAULT 0,
  height      INTEGER NOT NULL DEFAULT 0,
  uploaded_by TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL
);

-- Everyone who has ever signed in. Role decides what they may do.
--   author — write and edit their own posts, submit them for review
--   editor — the above, plus publish and unpublish any post
--   owner  — the above, plus change other people's roles
CREATE TABLE IF NOT EXISTS users (
  email      TEXT PRIMARY KEY,
  name       TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT 'author',
  created_at TEXT NOT NULL,
  last_seen  TEXT
);
