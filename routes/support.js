const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const FIELDS = ['issue_type', 'customer_name', 'order_id', 'platform', 'issue_date'];

function buildRecord(body) {
  const rec = {};
  for (const f of FIELDS) {
    if (body[f] === undefined) continue;
    rec[f] = body[f] !== '' ? body[f] : null;
  }
  return rec;
}

// GET all issues
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('support_issues')
      .select('*')
      .order('issue_date', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new issue
router.post('/', async (req, res) => {
  try {
    const rec = buildRecord(req.body);
    if (!rec.issue_type) return res.status(400).json({ error: 'issue_type is required' });
    if (!rec.issue_date) rec.issue_date = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('support_issues')
      .insert(rec)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update issue
router.put('/:id', async (req, res) => {
  try {
    const updates = buildRecord(req.body);
    const { data, error } = await supabase
      .from('support_issues')
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

// DELETE issue
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('support_issues')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
