const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// GET /api/ideas
router.get('/', async (req, res) => {
  try {
    const { data, error } = await sb()
      .from('ideas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ideas
router.post('/', async (req, res) => {
  try {
    const { body, color } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'Body required' });
    const { data, error } = await sb()
      .from('ideas')
      .insert({ body: body.trim(), color: color || 'yellow' })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/ideas/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.body  !== undefined) updates.body  = req.body.body.trim();
    if (req.body.color !== undefined) updates.color = req.body.color;
    const { data, error } = await sb()
      .from('ideas')
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

// DELETE /api/ideas/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await sb()
      .from('ideas')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
