-- Meeting minutes. The point is looking back — "when did we decide that",
-- "what did we agree with the agency in July" — so decisions are stored
-- apart from the running notes rather than buried inside them.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS meetings (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  met_on     DATE        NOT NULL,
  title      TEXT        NOT NULL,
  attendees  TEXT[]      DEFAULT '{}',
  notes      TEXT,
  decisions  TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings (met_on DESC);

ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE meetings TO anon;
GRANT ALL ON TABLE meetings TO authenticated;

-- Attendees are plain names, not team_members references. People outside
-- the company sit in these meetings, and a name recorded in July should
-- still read correctly after someone leaves the roster.
