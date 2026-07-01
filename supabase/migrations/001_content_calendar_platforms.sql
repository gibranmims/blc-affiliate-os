-- Migration: Multi-platform content calendar
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)

-- 1. Add new columns
ALTER TABLE content_calendar
  ADD COLUMN IF NOT EXISTS platform     TEXT NOT NULL DEFAULT 'tiktok_blc',
  ADD COLUMN IF NOT EXISTS script_text  TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'script';

-- 2. Backfill existing rows so they don't conflict
UPDATE content_calendar SET platform = 'tiktok_blc' WHERE platform IS NULL OR platform = '';

-- 3. Drop old unique constraint (Supabase names it automatically)
ALTER TABLE content_calendar
  DROP CONSTRAINT IF EXISTS content_calendar_week_start_day_of_week_key;

-- 4. Add new unique constraint that includes platform
ALTER TABLE content_calendar
  ADD CONSTRAINT content_calendar_week_platform_day_uq
  UNIQUE (week_start, day_of_week, platform);
