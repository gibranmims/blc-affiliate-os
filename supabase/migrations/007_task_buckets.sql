-- Task Buckets: per-person groupings inside each Team Tasks column
-- (Today / This Week / Save for Later — fully renameable and deletable)
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS task_buckets (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  assignee   TEXT        NOT NULL,
  name       TEXT        NOT NULL,
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Buckets are always read per-person, in display order
CREATE INDEX IF NOT EXISTS idx_task_buckets_assignee
  ON task_buckets (assignee, position);

-- The app talks to Supabase with the anon key, so a new table is
-- unreachable until it is granted — same as every other table here.
ALTER TABLE task_buckets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE task_buckets TO anon;
GRANT ALL ON TABLE task_buckets TO authenticated;

-- A task with no bucket lives in the "Unsorted" zone at the top of the column.
-- ON DELETE SET NULL: deleting a bucket never deletes the tasks inside it —
-- they fall back to Unsorted.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS bucket_id UUID REFERENCES task_buckets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_bucket ON tasks (bucket_id);

-- Starter buckets so the board isn't empty on first load.
-- These are ordinary rows — rename, reorder, or delete them like any other.
INSERT INTO task_buckets (assignee, name, position)
SELECT a.assignee, b.name, b.position
FROM   (VALUES ('founder'), ('tamar')) AS a(assignee)
CROSS JOIN (VALUES
  ('Today',          0),
  ('This Week',      1),
  ('This Month',     2),
  ('Save for Later', 3)
) AS b(name, position)
WHERE NOT EXISTS (
  SELECT 1 FROM task_buckets existing WHERE existing.assignee = a.assignee
);
