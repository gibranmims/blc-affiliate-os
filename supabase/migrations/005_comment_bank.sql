-- Comment Bank: save good TikTok comments (+ the video they're on) so they
-- never get lost before we film a reply.
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS comment_bank (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  video_url     TEXT        NOT NULL,
  comment_text  TEXT        NOT NULL,
  notes         TEXT,
  status        TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'replied'
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comment_bank_created ON comment_bank (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_bank_status  ON comment_bank (status);
