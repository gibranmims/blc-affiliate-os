const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const FIELDS = [
  'handle', 'name', 'email', 'product_category', 'follower_count',
  'last_30d_gmv', 'avg_engagement', 'estimated_post_rate', 'profile_url',
  'status', 'generated_email', 'sender', 'asked_rate',
  'on_camera', 'feels_natural', 'viral_potential', 'tier', 'evaluation_notes',
  'counter_offer_amount', 'counter_offer_email'
];

function buildRecord(body) {
  const rec = {};
  for (const f of FIELDS) {
    if (body[f] === undefined) continue;
    if (f === 'handle') rec.handle = String(body.handle).replace(/^@/, '').trim();
    else if (f === 'follower_count') rec.follower_count = body[f] ? parseInt(body[f]) : null;
    else if (['last_30d_gmv', 'asked_rate', 'counter_offer_amount'].includes(f))
      rec[f] = body[f] !== '' && body[f] !== null ? parseFloat(body[f]) : null;
    else rec[f] = body[f] !== '' ? body[f] : null;
  }
  return rec;
}

// GET all
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('outreach')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    if (!req.body.handle) return res.status(400).json({ error: 'Handle is required' });
    const rec = buildRecord(req.body);
    if (!rec.status) rec.status = 'drafted';

    const { data, error } = await supabase
      .from('outreach')
      .insert([rec])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const updates = buildRecord(req.body);
    const { data, error } = await supabase
      .from('outreach')
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

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('outreach')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
