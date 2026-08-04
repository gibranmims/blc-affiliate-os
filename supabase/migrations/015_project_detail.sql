-- Project detail view: tags on the project, plus attachments.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- Tags live on the project as a plain array. Free text, so a new label
-- never needs a migration — same reasoning as partner categories.
ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Attachments are links rather than uploaded files. No storage bucket is
-- configured, and what actually gets attached to a project here is a Figma
-- file, a Drive doc or a Notion page — all of which are URLs. Swapping in
-- real uploads later means adding a storage path column, not a rewrite.
CREATE TABLE IF NOT EXISTS project_attachments (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  url        TEXT        NOT NULL,
  kind       TEXT,                       -- figma | drive | pdf | doc | link
  position   INT         NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_attachments_project
  ON project_attachments (project_id, position);

ALTER TABLE project_attachments DISABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE project_attachments TO anon;
GRANT ALL ON TABLE project_attachments TO authenticated;

-- ON DELETE CASCADE here, unlike tasks: an attachment is a pointer that
-- only means anything in the context of its project, so it should not
-- outlive it the way a task does.
