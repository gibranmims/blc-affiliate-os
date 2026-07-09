-- Idea Bank: reusable content ideas that can be dragged onto the Content Calendar
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS content_ideas (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT        NOT NULL DEFAULT '',
  channel      TEXT,                            -- maps to a CC_PLATFORMS key, nullable = any channel
  content_type TEXT        NOT NULL DEFAULT 'script',
  status       TEXT        NOT NULL DEFAULT 'idea',
  script_text  TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_ideas_created ON content_ideas (created_at DESC);
