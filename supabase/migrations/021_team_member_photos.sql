-- Headshots for team members. Stored as a path in the existing
-- challenge-photos bucket (proven to work with the anon key already),
-- served through a server-side signed-URL proxy rather than a public URL.

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS photo_path TEXT;
