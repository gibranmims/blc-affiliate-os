const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

function cleanAttendees(v) {
  if (!Array.isArray(v)) return [];
  return v.map(a => String(a).trim()).filter(Boolean).slice(0, 30);
}

// GET /api/meetings — newest first, which is the order you look back in
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase()
      .from('meetings')
      .select('*')
      .order('met_on', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/meetings
router.post('/', async (req, res) => {
  try {
    const title = req.body.title?.trim();
    if (!req.body.met_on) return res.status(400).json({ error: 'met_on required' });
    if (!title)           return res.status(400).json({ error: 'Title required' });

    const row = {
      met_on: req.body.met_on,
      title: title.slice(0, 140),
      attendees: cleanAttendees(req.body.attendees),
      notes: req.body.notes?.trim() || null,
      decisions: req.body.decisions?.trim() || null
    };
    const { data, error } = await supabase().from('meetings').insert(row).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/meetings/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.met_on !== undefined) updates.met_on = req.body.met_on;
    if (req.body.title  !== undefined) {
      const t = req.body.title.trim();
      if (!t) return res.status(400).json({ error: 'Title required' });
      updates.title = t.slice(0, 140);
    }
    if (req.body.attendees !== undefined) updates.attendees = cleanAttendees(req.body.attendees);
    if (req.body.notes     !== undefined) updates.notes     = req.body.notes?.trim() || null;
    if (req.body.decisions !== undefined) updates.decisions = req.body.decisions?.trim() || null;

    const { data, error } = await supabase()
      .from('meetings').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/meetings/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase().from('meetings').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
