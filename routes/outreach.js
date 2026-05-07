const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GET all outreach records
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

// POST create new outreach record
router.post('/', async (req, res) => {
  try {
    const {
      handle, platform, niche, followers, tier, status,
      rate_offered, rate_negotiated, contact_email, contact_date, notes
    } = req.body;

    if (!handle) return res.status(400).json({ error: 'Handle is required' });

    const { data, error } = await supabase
      .from('outreach')
      .insert([{
        handle: handle.replace(/^@/, ''),
        platform: platform || 'TikTok',
        niche: niche || null,
        followers: followers ? parseInt(followers) : null,
        tier: tier || null,
        status: status || 'contacted',
        rate_offered: rate_offered ? parseFloat(rate_offered) : null,
        rate_negotiated: rate_negotiated ? parseFloat(rate_negotiated) : null,
        contact_email: contact_email || null,
        contact_date: contact_date || null,
        notes: notes || null
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update outreach record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      handle, platform, niche, followers, tier, status,
      rate_offered, rate_negotiated, contact_email, contact_date, notes
    } = req.body;

    const { data, error } = await supabase
      .from('outreach')
      .update({
        handle: handle ? handle.replace(/^@/, '') : undefined,
        platform,
        niche: niche || null,
        followers: followers ? parseInt(followers) : null,
        tier: tier || null,
        status,
        rate_offered: rate_offered ? parseFloat(rate_offered) : null,
        rate_negotiated: rate_negotiated ? parseFloat(rate_negotiated) : null,
        contact_email: contact_email || null,
        contact_date: contact_date || null,
        notes: notes || null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE outreach record
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
