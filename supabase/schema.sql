-- ============================================================
-- BLC Affiliate OS — Supabase Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Outreach table: tracks creator pitches and deal negotiations
CREATE TABLE IF NOT EXISTS outreach (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'TikTok',
  niche TEXT,
  followers INTEGER,
  tier TEXT CHECK (tier IN ('nano', 'micro', 'mid', 'macro', 'mega')),
  status TEXT NOT NULL DEFAULT 'contacted'
    CHECK (status IN ('contacted', 'interested', 'negotiating', 'signed', 'declined', 'ghosted')),
  rate_offered DECIMAL(10,2),
  rate_negotiated DECIMAL(10,2),
  contact_email TEXT,
  contact_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roster table: active affiliate database
CREATE TABLE IF NOT EXISTS roster (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handle TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'TikTok',
  niche TEXT,
  followers INTEGER,
  content_style TEXT,
  audience_demographics TEXT,
  content_submitted INTEGER DEFAULT 0,
  gmv DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,2) DEFAULT 15,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'paused')),
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE OR REPLACE TRIGGER update_outreach_updated_at
  BEFORE UPDATE ON outreach
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_roster_updated_at
  BEFORE UPDATE ON roster
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS (internal tool — no user auth layer)
ALTER TABLE outreach DISABLE ROW LEVEL SECURITY;
ALTER TABLE roster DISABLE ROW LEVEL SECURITY;
