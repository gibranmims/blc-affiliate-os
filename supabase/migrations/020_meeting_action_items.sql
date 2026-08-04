-- Action items on a meeting. They start as suggestions and only become
-- real work when someone picks them up, so the meeting record never
-- silently fills the task board.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

ALTER TABLE meetings ADD COLUMN IF NOT EXISTS action_items JSONB NOT NULL DEFAULT '[]';

-- Stored on the meeting rather than in their own table: an action item is
-- only ever read alongside its meeting, and once promoted the real record
-- is the task itself. Each entry is
--   { id, text, assignee, task_id }
-- where task_id is null until it has been added to the board — that null
-- is the whole difference between a suggestion and a commitment.
