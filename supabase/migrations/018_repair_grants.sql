-- Repair pass. A sweep of every endpoint found several tables the app
-- could not reach. None of it surfaced as an error in the UI because the
-- loaders catch failures and fall back to an empty array — so a broken
-- table looked exactly like an empty one.
--
--   content_calendar, content_ideas, ideas → exist, but anon has no GRANT
--   comment_bank, scripts                  → never created
--   expenses                               → created with RLS still on
--
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ── Tables that exist but are unreachable ───────────────────────────
ALTER TABLE content_calendar DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE content_calendar TO anon;
GRANT ALL ON TABLE content_calendar TO authenticated;

ALTER TABLE content_ideas DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE content_ideas TO anon;
GRANT ALL ON TABLE content_ideas TO authenticated;

ALTER TABLE ideas DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE ideas TO anon;
GRANT ALL ON TABLE ideas TO authenticated;

ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE expenses TO anon;
GRANT ALL ON TABLE expenses TO authenticated;

-- ── Tables that were never created ──────────────────────────────────
CREATE TABLE IF NOT EXISTS comment_bank (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url    TEXT        NOT NULL,
  comment_text TEXT        NOT NULL,
  notes        TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending',   -- pending | replied
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comment_bank_created ON comment_bank (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_bank_status  ON comment_bank (status);
ALTER TABLE comment_bank DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE comment_bank TO anon;
GRANT ALL ON TABLE comment_bank TO authenticated;

-- mode is not in schema.sql but the generator writes it on every row,
-- so it is included here rather than failing on first save.
CREATE TABLE IF NOT EXISTS scripts (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id     UUID,
  creator_handle TEXT,
  product_focus  TEXT,
  script_length  TEXT,
  content        TEXT        NOT NULL,
  mode           TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS mode TEXT;
CREATE INDEX IF NOT EXISTS idx_scripts_created ON scripts (created_at DESC);
ALTER TABLE scripts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE scripts TO anon;
GRANT ALL ON TABLE scripts TO authenticated;
