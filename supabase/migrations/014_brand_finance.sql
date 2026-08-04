-- Financials storage. Everything on this page — the weekly log, purchase
-- orders, account balances, pricing notes — lived in localStorage, which
-- meant it existed only in one browser: not shared with the team, not
-- backed up, and invisible to anyone else who opened the page.
--
-- Kept as key/value JSONB rather than modelled into tables. The page's
-- code already treats these as whole documents it loads and saves, so
-- this moves the data without rewriting that logic. Splitting the weekly
-- log into real rows is worth doing when the Weekly Scorecard is built
-- and the numbers need querying — this is deliberately not that.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS brand_finance (
  key        TEXT        PRIMARY KEY,
  value      JSONB       NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE brand_finance DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE brand_finance TO anon;
GRANT ALL ON TABLE brand_finance TO authenticated;

-- No seed rows. The app pushes up whatever is already in the browser the
-- first time it loads against an empty table, so existing numbers survive.
