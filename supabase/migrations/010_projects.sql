-- Projects: the initiatives the business is pushing on, each spanning
-- several areas of the OS. Bigger than a task, narrower than a hub.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

CREATE TABLE IF NOT EXISTS projects (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  status      TEXT        NOT NULL DEFAULT 'active',  -- planning | active | paused | done
  owner       TEXT,                                   -- founder | tamar | null
  target_date DATE,
  position    INT         NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_position ON projects (position);

-- The app reads Supabase with the anon key, so the table is unreachable
-- until it is granted — same as every other table here.
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE projects TO anon;
GRANT ALL ON TABLE projects TO authenticated;

-- A task can belong to a project. ON DELETE SET NULL so deleting a
-- project never deletes the work done under it — the tasks survive
-- unassigned, the same way buckets behave.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id);

-- The three initiatives currently in flight.
INSERT INTO projects (name, description, status, position)
SELECT v.name, v.description, 'active', v.position
FROM (VALUES
  ('Wholesale',                 'Re-launch the wholesale website and land stockists', 0),
  ('Pro Partner Network',       'Build the esthetician partner network into a paid membership', 1),
  ('TikTok Shop Affiliate Scale','Scale affiliate GMV on TikTok Shop with the agency', 2)
) AS v(name, description, position)
WHERE NOT EXISTS (SELECT 1 FROM projects);
