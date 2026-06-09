const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// GET /api/daily-top2
router.get('/', async (req, res) => {
  try {
    const { data, error } = await sb()
      .from('daily_top2')
      .select('*')
      .order('slot');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/daily-top2/:slot — update title and/or completed
router.put('/:slot', async (req, res) => {
  try {
    const slot = parseInt(req.params.slot);
    const updates = { updated_at: new Date().toISOString() };
    if (req.body.title     !== undefined) updates.title     = req.body.title || null;
    if (req.body.completed !== undefined) updates.completed = req.body.completed;
    const { data, error } = await sb()
      .from('daily_top2')
      .update(updates)
      .eq('slot', slot)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/daily-top2/reset — clear both slots for a fresh day
router.delete('/reset', async (req, res) => {
  try {
    const { error } = await sb()
      .from('daily_top2')
      .update({ title: null, completed: false, updated_at: new Date().toISOString() })
      .in('slot', [1, 2]);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
