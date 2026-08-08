# Auto-archive completed tasks

**Date:** 2026-08-07
**Status:** Approved, ready for implementation plan

## Problem

Checking a task off the Team Tasks board marks it `completed` and leaves it
sitting in the column, struck-through, until someone clicks the **Archive**
button next to it. Nobody does. Finished work piles up in every column and the
board stops showing what's actually left to do.

Archiving is also a one-way door today: `archived` rows are filtered out of
every view in the app, and no screen can show them. The row survives in
Supabase but is unreachable from the UI.

## Goal

Checking a task off gets it out of the way on its own, without a second click —
while keeping finished work somewhere you can go back to.

## Behaviour

### Check-off

1. Clicking the check renders the row as leaving: struck-through, dimmed, and
   the **Archive** button replaced by **Undo**. A 5-second timer starts.
2. The check-off itself is the existing single `PUT {completed: true}`. Nothing
   irreversible has happened yet.
3. On expiry, a second `PUT {archived: true}` fires, the row leaves the column,
   and it appears in that person's Archived section.
4. **Undo** cancels the timer and sends `PUT {completed: false}`. The row
   returns to normal. Unchecking the box during the window does the same.

The timer is in-memory only.

### Sweep on load

A page refresh mid-window leaves a task `completed && !archived`. So on every
task load, any task in that state is archived immediately, with no undo window
— the user has already seen the check land. This also picks up completions made
by another team member on another machine.

### Errors

If the archive `PUT` fails, the row stays on the board struck-through and an
error toast shows. The row is never removed optimistically.

## Archive view

A collapsed row at the foot of each person's column: `▸ Archived (12)`. Every
column gets one, including **For Founder** — which renders as a flat list
(`renderTaskList`) rather than bucketed, so the section attaches to the column
rather than to any bucket.

Expanded, it lists archived tasks newest-first by `archived_at`, grouped under
**Today** / **Yesterday** / date headers. Each row is struck-through with a
**Restore** button. Collapse state is stored per-browser in `localStorage`,
following the existing `BUCKET_COLLAPSE_KEY` pattern.

The list covers the last 30 days, then a plain count line — "and 40 older". No
pagination or search.

**Restore** sends `PUT {archived: false, completed: false}`. The task returns to
its bucket as live, unchecked work.

> Restore must clear `completed`. If it left the task checked, the load sweep
> above would immediately re-archive it and Restore would appear broken.

## Project tasks

`projectTasks()` (`public/js/app.js:875`) currently filters out archived rows,
so auto-archiving would drop completed tasks out of both the numerator and
denominator of `projectProgress()` — a project would read 0% however much work
was finished.

- `projectTasks()` stops filtering on `archived`, so progress counts finished
  work. A project reads "3 of 5" rather than sliding toward "0 of 2".
- The project detail task table still renders only live tasks, with an
  expandable `3 archived` line beneath them.
- Existing "open work" counts already filter on `!completed`, so they are
  unaffected.

## Data

Migration `supabase/migrations/023_task_archived_at.sql`, following the
existing idempotent run-in-the-SQL-editor convention:

- `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`
- Backfill existing archived rows from `created_at` so they sort sensibly
- Index on `(assignee, archived_at DESC)`

`routes/tasks.js` stamps `archived_at` server-side when `archived` flips to
true and clears it when false. The browser never sends a timestamp.

## Out of scope

`GET /api/tasks` returns every row including archived, so the response grows
without bound. At a few hundred tasks this does not matter. The fix, when it
does, is a `?since=` cutoff applied to archived rows only. Not built now.

## Verification

The repo has no test framework. Verification is manual, against the dev server
in the browser:

- Check a task — confirm the undo window renders and **Undo** restores it
- Let a window expire — confirm the row leaves and lands in the archive
- Restore from the archive — confirm it returns unchecked and is not re-swept
- Refresh mid-window — confirm the load sweep archives it
- Check a project task — confirm the progress bar counts it as done

## Touched files

- `public/js/app.js` — `toggleTask`, `toggleProjectTask`, `archiveTask`,
  `renderTaskItem`, `tasksIn`, `renderBucketedColumn`, `projectTasks`, task load
- `routes/tasks.js` — `archived_at` stamping on `PUT`
- `supabase/migrations/023_task_archived_at.sql` — new
