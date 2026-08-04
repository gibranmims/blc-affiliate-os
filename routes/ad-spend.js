const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

const PLATFORMS = ['meta', 'google', 'tiktok', 'other'];

// GET /api/ad-spend
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase()
      .from('ad_spend')
      .select('*')
      .order('week_ending', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ad-spend — upsert, so re-entering a week corrects it rather
// than stacking a second row for the same platform.
router.post('/', async (req, res) => {
  try {
    const { week_ending, platform } = req.body;
    if (!week_ending) return res.status(400).json({ error: 'week_ending required' });
    if (!PLATFORMS.includes(platform)) return res.status(400).json({ error: 'Unknown platform' });

    const row = {
      week_ending,
      platform,
      amount: Number(req.body.amount) || 0,
      notes: req.body.notes?.trim() || null
    };

    const { data, error } = await supabase()
      .from('ad_spend')
      .upsert(row, { onConflict: 'week_ending,platform' })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ad-spend/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase().from('ad_spend').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
