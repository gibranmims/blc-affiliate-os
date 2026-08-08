-- ============================================================
-- Pro Partner Applications — OS-side overlay
-- Run this in the BLC OS Supabase SQL Editor.
--
-- The applications themselves live in the partner portal's database and
-- are read live over its API, so stage can never drift. This table holds
-- only what the OS adds on top: your notes and whether you've personally
-- reached out. Keyed by the portal's application id.
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_app_notes (
  portal_application_id  TEXT PRIMARY KEY,
  notes                  TEXT,
  reached_out            BOOLEAN NOT NULL DEFAULT FALSE,
  reached_out_at         TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE partner_app_notes DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE partner_app_notes TO anon;
GRANT ALL ON TABLE partner_app_notes TO authenticated;
