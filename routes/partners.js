const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// Editable text fields. Category is free text on purpose — a new kind of
// partner should never need a schema change.
const FIELDS = ['name', 'category', 'contact_name', 'contact_email', 'contact_phone', 'link', 'notes'];

// GET /api/partners
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase()
      .from('partners')
      .select('*')
      .order('position', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/partners
router.post('/', async (req, res) => {
  try {
    if (!req.body.name?.trim()) return res.status(400).json({ error: 'Name required' });

    const { data: existing, error: readErr } = await supabase()
      .from('partners')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);
    if (readErr) throw readErr;

    const row = { position: existing?.length ? existing[0].position + 1 : 0 };
    FIELDS.forEach(f => {
      const v = req.body[f];
      if (v !== undefined && v !== null && String(v).trim()) row[f] = String(v).trim();
    });

    const { data, error } = await supabase().from('partners').insert(row).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/partners/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    FIELDS.forEach(f => {
      if (req.body[f] === undefined) return;
      const v = req.body[f];
      updates[f] = v === null || !String(v).trim() ? null : String(v).trim();
    });
    if (updates.name === null) return res.status(400).json({ error: 'Name required' });
    if (req.body.position !== undefined) updates.position = req.body.position;

    const { data, error } = await supabase()
      .from('partners')
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

// DELETE /api/partners/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase().from('partners').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
