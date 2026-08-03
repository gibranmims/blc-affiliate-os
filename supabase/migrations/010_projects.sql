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

-- No seed rows on purpose. Projects are added by hand in the app so the
-- list is always something a person decided to track, never something a
-- migration decided for them.
