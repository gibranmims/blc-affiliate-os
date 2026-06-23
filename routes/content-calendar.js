const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// GET /api/content-calendar?week=2026-06-23
router.get('/', async (req, res) => {
  try {
    const { week } = req.query;
    let q = sb().from('content_calendar').select('*');
    if (week) q = q.eq('week_start', week);
    const { data, error } = await q.order('day_of_week');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content-calendar  (upsert by week_start + day_of_week)
router.post('/', async (req, res) => {
  try {
    const { week_start, day_of_week, title, script_url, status, notes } = req.body;
    if (!week_start || day_of_week === undefined)
      return res.status(400).json({ error: 'week_start and day_of_week required' });
    const { data, error } = await sb()
      .from('content_calendar')
      .upsert(
        { week_start, day_of_week: parseInt(day_of_week), title: title || null, script_url: script_url || null, status: status || 'idea', notes: notes || null },
        { onConflict: 'week_start,day_of_week' }
      )
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/content-calendar/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    for (const f of ['title', 'script_url', 'status', 'notes']) {
      if (req.body[f] !== undefined) updates[f] = req.body[f] || null;
    }
    const { data, error } = await sb()
      .from('content_calendar')
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

// DELETE /api/content-calendar/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await sb()
      .from('content_calendar')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
