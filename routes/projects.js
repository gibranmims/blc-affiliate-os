const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

const STATUSES = ['planning', 'active', 'paused', 'done'];

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase()
      .from('projects')
      .select('*')
      .order('position', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  try {
    const { name, description, status, owner, target_date } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const { data: existing, error: readErr } = await supabase()
      .from('projects')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);
    if (readErr) throw readErr;

    const row = {
      name: name.trim().slice(0, 80),
      position: existing?.length ? existing[0].position + 1 : 0,
      status: STATUSES.includes(status) ? status : 'active'
    };
    if (description) row.description = description.trim();
    if (owner)       row.owner       = owner;
    if (target_date) row.target_date = target_date;
    if (Array.isArray(req.body.tags)) row.tags = req.body.tags.map(t => String(t).trim()).filter(Boolean);

    const { data, error } = await supabase().from('projects').insert(row).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/reorder  { ids: [...] } — ids in their new display order
router.post('/reorder', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids array required' });
    const db = supabase();
    for (let i = 0; i < ids.length; i++) {
      const { error } = await db.from('projects').update({ position: i }).eq('id', ids[i]);
      if (error) throw error;
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) {
      const name = req.body.name.trim();
      if (!name) return res.status(400).json({ error: 'Name required' });
      updates.name = name.slice(0, 80);
    }
    if (req.body.description !== undefined) updates.description = req.body.description || null;
    if (req.body.owner       !== undefined) updates.owner       = req.body.owner || null;
    if (req.body.target_date !== undefined) updates.target_date = req.body.target_date || null;
    if (req.body.tags        !== undefined) {
      updates.tags = Array.isArray(req.body.tags)
        ? req.body.tags.map(t => String(t).trim()).filter(Boolean) : [];
    }
    if (req.body.status      !== undefined) {
      if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
      updates.status = req.body.status;
    }

    const { data, error } = await supabase()
      .from('projects')
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

// DELETE /api/projects/:id
// Tasks under it survive unassigned via ON DELETE SET NULL.
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase().from('projects').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
