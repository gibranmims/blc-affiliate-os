const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// GET all roster records
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('roster')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new roster record
router.post('/', async (req, res) => {
  try {
    const {
      handle, platform, niche, followers, content_style,
      audience_demographics, content_submitted, gmv,
      commission_rate, status, email, notes
    } = req.body;

    if (!handle) return res.status(400).json({ error: 'Handle is required' });

    const { data, error } = await supabase
      .from('roster')
      .insert([{
        handle: handle.replace(/^@/, ''),
        platform: platform || 'TikTok',
        niche: niche || null,
        followers: followers ? parseInt(followers) : null,
        content_style: content_style || null,
        audience_demographics: audience_demographics || null,
        content_submitted: content_submitted ? parseInt(content_submitted) : 0,
        gmv: gmv ? parseFloat(gmv) : 0,
        commission_rate: commission_rate ? parseFloat(commission_rate) : 15,
        status: status || 'active',
        email: email || null,
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

// PUT update roster record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      handle, platform, niche, followers, content_style,
      audience_demographics, content_submitted, gmv,
      commission_rate, status, email, notes
    } = req.body;

    const { data, error } = await supabase
      .from('roster')
      .update({
        handle: handle ? handle.replace(/^@/, '') : undefined,
        platform,
        niche: niche || null,
        followers: followers ? parseInt(followers) : null,
        content_style: content_style || null,
        audience_demographics: audience_demographics || null,
        content_submitted: content_submitted ? parseInt(content_submitted) : 0,
        gmv: gmv ? parseFloat(gmv) : 0,
        commission_rate: commission_rate ? parseFloat(commission_rate) : 15,
        status,
        email: email || null,
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

// DELETE roster record
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('roster')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
