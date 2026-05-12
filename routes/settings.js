const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Keys that are allowed to be read/written via this public settings API
const ALLOWED_KEYS = ['discord_invite_link'];

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ALLOWED_KEYS);
    if (error) throw error;
    const out = {};
    (data || []).forEach(row => {
      // JSONB value comes back as parsed JS — could be string, object, etc.
      out[row.key] = typeof row.value === 'string' ? row.value : (row.value?.v ?? row.value);
    });
    res.json(out);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const rows = [];
    for (const key of ALLOWED_KEYS) {
      if (req.body[key] !== undefined) {
        rows.push({ key, value: req.body[key] });
      }
    }
    if (rows.length === 0) return res.json({ success: true });
    const { error } = await supabase
      .from('app_settings')
      .upsert(rows, { onConflict: 'key' });
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
