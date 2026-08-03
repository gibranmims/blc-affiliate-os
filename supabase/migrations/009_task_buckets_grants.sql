-- Fix-up for 007, which created task_buckets without granting it.
-- The app reads Supabase with the anon key, so the table returned
-- "permission denied" until these ran. 007 now includes them, so this
-- file only matters for databases where 007 already ran.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

ALTER TABLE task_buckets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE task_buckets TO anon;
GRANT ALL ON TABLE task_buckets TO authenticated;

-- Re-seed only if 007's INSERT did not land. Guarded, so re-running
-- this never duplicates a bucket.
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
