-- When a task was archived — drives the ordering and Today/Yesterday grouping
-- of the per-person Archived section on the Team Tasks board.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Rows archived before this column existed get their created_at as a
-- stand-in, so they sort sensibly instead of clumping at the bottom.
UPDATE tasks
SET    archived_at = created_at
WHERE  archived = TRUE AND archived_at IS NULL;

-- The archive section reads one person's archive newest-first.
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_archived_at
  ON tasks (assignee, archived_at DESC)
  WHERE archived = TRUE;
