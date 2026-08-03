const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// GET /api/task-buckets
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase()
      .from('task_buckets')
      .select('*')
      .order('assignee', { ascending: true })
      .order('position', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/task-buckets
router.post('/', async (req, res) => {
  try {
    const { assignee, name } = req.body;
    if (!assignee?.trim()) return res.status(400).json({ error: 'Assignee required' });
    if (!name?.trim())     return res.status(400).json({ error: 'Name required' });

    // Append to the end of that person's list
    const { data: existing, error: readErr } = await supabase()
      .from('task_buckets')
      .select('position')
      .eq('assignee', assignee)
      .order('position', { ascending: false })
      .limit(1);
    if (readErr) throw readErr;
    const position = existing?.length ? existing[0].position + 1 : 0;

    const { data, error } = await supabase()
      .from('task_buckets')
      .insert({ assignee, name: name.trim().slice(0, 40), position })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/task-buckets/reorder  { ids: [...] }  — ids in their new display order
router.post('/reorder', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const db = supabase();
    for (let i = 0; i < ids.length; i++) {
      const { error } = await db.from('task_buckets').update({ position: i }).eq('id', ids[i]);
      if (error) throw error;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/task-buckets/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) {
      const name = req.body.name.trim();
      if (!name) return res.status(400).json({ error: 'Name required' });
      updates.name = name.slice(0, 40);
    }
    if (req.body.position !== undefined) updates.position = req.body.position;

    const { data, error } = await supabase()
      .from('task_buckets')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/task-buckets/:id
// Tasks inside fall back to Unsorted via ON DELETE SET NULL — they are never deleted.
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase()
      .from('task_buckets')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
