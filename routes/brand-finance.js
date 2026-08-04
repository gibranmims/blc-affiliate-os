const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// Only these keys are storable — an unknown key is a bug, not a feature,
// and this keeps a typo from quietly creating a second source of truth.
const KEYS = new Set(['blc_weekly_log', 'blc_pos', 'blc_accounts', 'blc_pricing_notes']);

// GET /api/brand-finance → { key: value, ... }
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase().from('brand_finance').select('key, value');
    if (error) throw error;
    const out = {};
    (data || []).forEach(r => { out[r.key] = r.value; });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/brand-finance/:key  { value }
router.put('/:key', async (req, res) => {
  try {
    const key = req.params.key;
    if (!KEYS.has(key)) return res.status(400).json({ error: `Unknown key: ${key}` });
    if (req.body.value === undefined) return res.status(400).json({ error: 'value required' });

    const { data, error } = await supabase()
      .from('brand_finance')
      .upsert({ key, value: req.body.value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
