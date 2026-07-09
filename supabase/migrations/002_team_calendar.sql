-- Team Calendar: track who's out, on vacation, OOO, etc.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS team_calendar (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  member_key   TEXT        NOT NULL,
  absence_type TEXT        NOT NULL DEFAULT 'vacation',
  start_date   DATE        NOT NULL,
  end_date     DATE        NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient date-range queries
CREATE INDEX IF NOT EXISTS idx_team_calendar_dates
  ON team_calendar (start_date, end_date);
