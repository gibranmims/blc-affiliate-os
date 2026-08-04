-- Weekly ad spend by platform. The Financials log already carries a
-- tiktok_ad_spend field, but that predates running Meta and Google and
-- can't hold more than one platform. This is the general version.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS ad_spend (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  week_ending DATE          NOT NULL,
  platform    TEXT          NOT NULL,      -- meta | google | tiktok | other
  amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (week_ending, platform)
);

CREATE INDEX IF NOT EXISTS idx_ad_spend_week ON ad_spend (week_ending);

ALTER TABLE ad_spend DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE ad_spend TO anon;
GRANT ALL ON TABLE ad_spend TO authenticated;

-- One row per platform per week, enforced by the unique constraint, so
-- re-entering a week overwrites rather than double-counting the spend.
