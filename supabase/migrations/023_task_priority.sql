-- Task priority: high | medium | low, and always optional.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
--
-- Deliberately nullable with no default. Existing tasks stay unranked rather
-- than being silently declared "medium", so a priority badge on the board
-- means somebody actually decided — not that a default got backfilled.

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority TEXT;

-- Guard the three known values. NULL stays legal — that is "unranked".
ALTER TABLE tasks
  DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IS NULL OR priority IN ('high', 'medium', 'low'));

-- The board reads one person's open work at a time and now orders it by
-- priority underneath the urgency band.
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_priority
  ON tasks (assignee, priority);
