const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// GET /api/comment-bank
router.get('/', async (req, res) => {
  try {
    const { data, error } = await sb()
      .from('comment_bank')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/comment-bank
router.post('/', async (req, res) => {
  try {
    const { video_url, comment_text, notes } = req.body;
    if (!video_url?.trim())    return res.status(400).json({ error: 'Video link required' });
    if (!comment_text?.trim()) return res.status(400).json({ error: 'Comment text required' });
    const { data, error } = await sb()
      .from('comment_bank')
      .insert({ video_url: video_url.trim(), comment_text: comment_text.trim(), notes: notes?.trim() || null })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/comment-bank/:id
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.video_url    !== undefined) updates.video_url    = req.body.video_url.trim();
    if (req.body.comment_text !== undefined) updates.comment_text = req.body.comment_text.trim();
    if (req.body.notes        !== undefined) updates.notes        = req.body.notes?.trim() || null;
    if (req.body.status       !== undefined) updates.status       = req.body.status;
    const { data, error } = await sb()
      .from('comment_bank')
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

// DELETE /api/comment-bank/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await sb()
      .from('comment_bank')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
