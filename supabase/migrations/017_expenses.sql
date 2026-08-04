-- Operating expenses, so Financials can produce a P&L rather than only a
-- cash and revenue view. Ads come from ad_spend and software from
-- subscriptions; this covers everything else — payroll, shipping, fees,
-- contractors, one-offs.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS expenses (
  id         UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  spent_on   DATE          NOT NULL,
  category   TEXT          NOT NULL DEFAULT 'Other',
  amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  vendor     TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ   DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (spent_on);

ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE expenses TO anon;
GRANT ALL ON TABLE expenses TO authenticated;

-- Category is free text with suggestions in the UI, not an enum, so a new
-- kind of cost never needs a migration.
--
-- Cost per unit is not a column here. It belongs to the product, not to a
-- single expense, so it lives in brand_finance under blc_cogs and is set
-- once on the P&L tab.
