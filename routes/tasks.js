const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

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
    const { title, assignee } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title required' });
    const { data, error } = await supabase()
      .from('tasks')
      .insert({ title: title.trim(), assignee: assignee || 'founder' })
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
    const { data, error } = await supabase()
      .from('tasks')
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
