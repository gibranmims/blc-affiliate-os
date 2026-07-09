const express = require('express');
const router  = express.Router();
const { createClient } = require('@supabase/supabase-js');

function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// GET ?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    let q = sb().from('team_calendar').select('*');
    if (start) q = q.gte('end_date',   start);
    if (end)   q = q.lte('start_date', end);
    const { data, error } = await q.order('start_date');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — create absence
router.post('/', async (req, res) => {
  try {
    const { member_key, absence_type = 'vacation', start_date, end_date, notes } = req.body;
    if (!member_key || !start_date || !end_date)
      return res.status(400).json({ error: 'member_key, start_date, end_date required' });
    const { data, error } = await sb()
      .from('team_calendar')
      .insert({ member_key, absence_type, start_date, end_date, notes: notes || null })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /:id — update absence
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    for (const f of ['member_key', 'absence_type', 'start_date', 'end_date', 'notes']) {
      if (req.body[f] !== undefined) updates[f] = req.body[f] || null;
    }
    const { data, error } = await sb()
      .from('team_calendar')
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

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await sb()
      .from('team_calendar')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
