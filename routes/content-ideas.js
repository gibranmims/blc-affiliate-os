const express = require('express');
const router  = express.Router();
const { createClient } = require('@supabase/supabase-js');

function sb() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await sb()
      .from('content_ideas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { title, channel, content_type, status, script_text, notes } = req.body;
    const { data, error } = await sb()
      .from('content_ideas')
      .insert({ title: title || '', channel: channel || null, content_type: content_type || 'script', status: status || 'idea', script_text: script_text || null, notes: notes || null })
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, channel, content_type, status, script_text, notes } = req.body;
    const { data, error } = await sb()
      .from('content_ideas')
      .update({ title, channel: channel || null, content_type, status, script_text: script_text || null, notes: notes || null })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await sb().from('content_ideas').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
