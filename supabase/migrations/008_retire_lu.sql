-- Retire the "Lu" seat from Team Tasks.
-- Open work moves to Gibran so nothing is lost; finished work is archived
-- out of view rather than deleted, so the history survives.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- 1. Open tasks → Gibran's column (bucket_id stays NULL → lands in Unsorted)
UPDATE tasks
SET    assignee  = 'founder',
       bucket_id = NULL
WHERE  assignee  = 'lu'
  AND  completed = false
  AND  archived  = false;

-- 2. Completed tasks → archived, still attributed to Lu in the record
UPDATE tasks
SET    archived = true
WHERE  assignee = 'lu'
  AND  completed = true
  AND  archived  = false;

-- 3. Drop any buckets that belonged to the retired seat
DELETE FROM task_buckets WHERE assignee = 'lu';
