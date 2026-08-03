-- Team members, so the roster is data rather than hardcoded columns.
-- Adding someone should never need a deploy.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS team_members (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  member_key TEXT        NOT NULL UNIQUE,   -- matches tasks.assignee
  name       TEXT        NOT NULL,
  initials   TEXT,
  color      TEXT,
  active     BOOLEAN     NOT NULL DEFAULT true,
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_position ON team_members (position);

ALTER TABLE team_members DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE team_members TO anon;
GRANT ALL ON TABLE team_members TO authenticated;

-- These two rows are not seed data for its own sake: every existing task
-- already carries assignee 'founder' or 'tamar', and the board reads
-- columns from this table now. Without them that work would have no
-- column to appear in. ON CONFLICT so a re-run is harmless.
INSERT INTO team_members (member_key, name, initials, color, position) VALUES
  ('founder', 'Gibran', 'G', '#f2f4f9', 0),
  ('tamar',   'Tamar',  'T', '#f2f4f9', 1)
ON CONFLICT (member_key) DO NOTHING;
