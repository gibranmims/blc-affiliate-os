-- Partners: the outside parties the business runs on — manufacturing,
-- marketplaces, the accounting team, the affiliate agency, contractors.
-- Everything here is user-editable, including the categories, which are
-- free text rather than an enum so a new kind of partner never needs a
-- migration.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS partners (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT        NOT NULL,
  category      TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  link          TEXT,
  notes         TEXT,
  position      INT         NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partners_position ON partners (position);

-- The app reads Supabase with the anon key, so the table is unreachable
-- until it is granted — same as every other table here.
ALTER TABLE partners DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE partners TO anon;
GRANT ALL ON TABLE partners TO authenticated;

-- Starter rows. Ordinary records — rename, recategorise or delete freely.
INSERT INTO partners (name, category, position)
SELECT v.name, v.category, v.position
FROM (VALUES
  ('Manufacturing',    'Supply chain', 0),
  ('Amazon',           'Marketplace',  1),
  ('Accounting Team',  'Finance',      2),
  ('Affiliate Agency', 'Growth',       3),
  ('Customer Support', 'Contractor',   4)
) AS v(name, category, position)
WHERE NOT EXISTS (SELECT 1 FROM partners);
