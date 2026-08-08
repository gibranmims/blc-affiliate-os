const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// Priority is optional everywhere — null means "unranked", which is the
// state every task starts in and most stay in.
const PRIORITIES = ['high', 'medium', 'low'];

// GET /api/tasks
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase()
      .from('tasks')
      .select('*')
      .order('completed', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks
router.post('/', async (req, res) => {
  try {
    const { title, assignee, tag, deadline, bucket_id, project_id, priority } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
    if (priority && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }
    const row = { title: title.trim(), assignee: assignee || 'founder' };
    if (tag)        row.tag        = tag;
    if (deadline)   row.deadline   = deadline;
    if (bucket_id)  row.bucket_id  = bucket_id;
    if (project_id) row.project_id = project_id;
    if (priority)   row.priority   = priority;
    const { data, error } = await supabase()
      .from('tasks')
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.title     !== undefined) updates.title     = req.body.title.trim();
    if (req.body.completed !== undefined) updates.completed = req.body.completed;
    if (req.body.notes     !== undefined) updates.notes     = req.body.notes;
    if (req.body.archived  !== undefined) {
      updates.archived = req.body.archived;
      // Stamped here, never by the browser. Cleared on restore so the
      // archive list can't sort a restored-then-rearchived task by a
      // timestamp from its first life.
      updates.archived_at = req.body.archived ? new Date().toISOString() : null;
    }
    if (req.body.tag       !== undefined) updates.tag       = req.body.tag || null;
    if (req.body.deadline  !== undefined) updates.deadline  = req.body.deadline || null;
    if (req.body.bucket_id  !== undefined) updates.bucket_id  = req.body.bucket_id  || null;
    if (req.body.project_id !== undefined) updates.project_id = req.body.project_id || null;
    if (req.body.priority   !== undefined) {
      const p = req.body.priority || null;
      if (p && !PRIORITIES.includes(p)) {
        return res.status(400).json({ error: 'Invalid priority' });
      }
      updates.priority = p;
    }
    // Reassigning is a real edit — the modal's Assignee dropdown and a drag
    // into someone else's column both land here. Without this the board can
    // move a task's bucket to another person while its owner stays behind,
    // and the task matches no column at all.
    if (req.body.assignee !== undefined) {
      const a = String(req.body.assignee || '').trim();
      if (!a) return res.status(400).json({ error: 'Assignee required' });
      updates.assignee = a;
    }
    let { data, error } = await supabase()
      .from('tasks')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    // Migration 024 is run by hand, so the column can lag the code. Archiving
    // still has to work in the gap — retry without the timestamp.
    if (error && 'archived_at' in updates && /archived_at/.test(error.message || '')) {
      delete updates.archived_at;
      ({ data, error } = await supabase()
        .from('tasks')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single());
    }
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase()
      .from('tasks')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
