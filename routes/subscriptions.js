const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

const TEXT_FIELDS = ['name', 'category', 'paid_with', 'owner', 'link', 'notes'];
const CYCLES   = ['weekly', 'monthly', 'yearly'];
const STATUSES = ['active', 'cancelled'];

// GET /api/subscriptions
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase()
      .from('subscriptions')
      .select('*')
      .order('position', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subscriptions
router.post('/', async (req, res) => {
  try {
    if (!req.body.name?.trim()) return res.status(400).json({ error: 'Name required' });

    const { data: existing, error: readErr } = await supabase()
      .from('subscriptions').select('position').order('position', { ascending: false }).limit(1);
    if (readErr) throw readErr;

    const row = { position: existing?.length ? existing[0].position + 1 : 0 };
    TEXT_FIELDS.forEach(f => {
      const v = req.body[f];
      if (v !== undefined && v !== null && String(v).trim()) row[f] = String(v).trim();
    });
    row.amount = Number(req.body.amount) || 0;
    row.cycle  = CYCLES.includes(req.body.cycle)     ? req.body.cycle  : 'monthly';
    row.status = STATUSES.includes(req.body.status)  ? req.body.status : 'active';
    if (req.body.renews_on) row.renews_on = req.body.renews_on;

    const { data, error } = await supabase().from('subscriptions').insert(row).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subscriptions/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    TEXT_FIELDS.forEach(f => {
      if (req.body[f] === undefined) return;
      const v = req.body[f];
      updates[f] = v === null || !String(v).trim() ? null : String(v).trim();
    });
    if (updates.name === null) return res.status(400).json({ error: 'Name required' });
    if (req.body.amount    !== undefined) updates.amount    = Number(req.body.amount) || 0;
    if (req.body.renews_on !== undefined) updates.renews_on = req.body.renews_on || null;
    if (req.body.cycle     !== undefined) {
      if (!CYCLES.includes(req.body.cycle)) return res.status(400).json({ error: 'Invalid cycle' });
      updates.cycle = req.body.cycle;
    }
    if (req.body.status !== undefined) {
      if (!STATUSES.includes(req.body.status)) return res.status(400).json({ error: 'Invalid status' });
      updates.status = req.body.status;
    }

    const { data, error } = await supabase()
      .from('subscriptions').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subscriptions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase().from('subscriptions').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
