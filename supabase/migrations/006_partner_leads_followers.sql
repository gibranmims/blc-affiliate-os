-- ============================================================
-- Pro Partner Outreach — add follower count for prioritization
-- (this is a viral/content play, not local/geographic — follower
-- count matters more than city for judging a lead's potential reach)
-- Run this in Supabase SQL Editor
-- ============================================================

ALTER TABLE partner_leads ADD COLUMN IF NOT EXISTS follower_count INTEGER;
