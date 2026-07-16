-- ============================================================
-- Pro Partner Network — IG DM Outreach Tracker
-- Run this in Supabase SQL Editor
-- ============================================================

-- Rotating DM message templates/variants
CREATE TABLE IF NOT EXISTS partner_dm_templates (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,           -- e.g. "Variant A - direct invite"
  body         TEXT NOT NULL,           -- with {{name}}, {{studio}}, {{detail}} placeholders
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE partner_dm_templates DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE partner_dm_templates TO anon;
GRANT ALL ON TABLE partner_dm_templates TO authenticated;

-- Leads: licensed estheticians / wax studios found on Instagram
CREATE TABLE IF NOT EXISTS partner_leads (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identity / sourcing
  ig_handle           TEXT NOT NULL,
  studio_name         TEXT,
  esthetician_name    TEXT,             -- personal name, for personalization
  city                TEXT,
  region              TEXT,             -- state/province, for filtering
  profile_url         TEXT,
  source_tag          TEXT,             -- hashtag / geotag / studio-search term used to find them
  found_detail        TEXT,             -- specific detail used in personalization ("saw your Brazilian wax reel")

  -- Outreach
  status              TEXT NOT NULL DEFAULT 'not_contacted',
    -- not_contacted | contacted | replied | applied | accepted | not_interested | no_response
  template_id         UUID REFERENCES partner_dm_templates(id) ON DELETE SET NULL,
  contacted_date      DATE,
  followup_due_date   DATE,
  followup_sent_date  DATE,
  replied_date        DATE,
  applied_date        DATE,             -- manually logged when they submit portal application
  accepted_date       DATE,
  portal_applied      BOOLEAN NOT NULL DEFAULT FALSE,  -- manual flag, no cross-app integration yet

  notes               TEXT,

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_leads_status   ON partner_leads (status);
CREATE INDEX IF NOT EXISTS idx_partner_leads_followup ON partner_leads (followup_due_date);
CREATE INDEX IF NOT EXISTS idx_partner_leads_template ON partner_leads (template_id);
CREATE INDEX IF NOT EXISTS idx_partner_leads_city     ON partner_leads (city);

ALTER TABLE partner_leads DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE partner_leads TO anon;
GRANT ALL ON TABLE partner_leads TO authenticated;

CREATE OR REPLACE TRIGGER update_partner_leads_updated_at
  BEFORE UPDATE ON partner_leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_partner_dm_templates_updated_at
  BEFORE UPDATE ON partner_dm_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
