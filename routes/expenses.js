const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// GET /api/expenses
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase()
      .from('expenses')
      .select('*')
      .order('spent_on', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/expenses
router.post('/', async (req, res) => {
  try {
    const { spent_on } = req.body;
    if (!spent_on) return res.status(400).json({ error: 'spent_on required' });
    const row = {
      spent_on,
      category: req.body.category?.trim() || 'Other',
      amount: Number(req.body.amount) || 0,
      vendor: req.body.vendor?.trim() || null,
      notes: req.body.notes?.trim() || null
    };
    const { data, error } = await supabase().from('expenses').insert(row).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.spent_on !== undefined) updates.spent_on = req.body.spent_on;
    if (req.body.category !== undefined) updates.category = req.body.category?.trim() || 'Other';
    if (req.body.amount   !== undefined) updates.amount   = Number(req.body.amount) || 0;
    if (req.body.vendor   !== undefined) updates.vendor   = req.body.vendor?.trim() || null;
    if (req.body.notes    !== undefined) updates.notes    = req.body.notes?.trim() || null;

    const { data, error } = await supabase()
      .from('expenses').update(updates).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase().from('expenses').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
