-- Subscription tracker: the recurring software and services the business
-- pays for. Answers "what are we actually spending every month" without
-- digging through a card statement.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT        NOT NULL,
  category      TEXT,
  amount        NUMERIC(10,2) NOT NULL DEFAULT 0,
  cycle         TEXT        NOT NULL DEFAULT 'monthly',  -- monthly | yearly | weekly
  renews_on     DATE,
  paid_with     TEXT,                                     -- which card / account
  owner         TEXT,                                     -- team member_key
  status        TEXT        NOT NULL DEFAULT 'active',    -- active | cancelled
  link          TEXT,
  notes         TEXT,
  position      INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status, position);

ALTER TABLE subscriptions DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE subscriptions TO anon;
GRANT ALL ON TABLE subscriptions TO authenticated;

-- No seed rows — every subscription is one someone actually added.
