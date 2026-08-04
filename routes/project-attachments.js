const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// Guess the kind from the URL so the card can show the right icon without
// asking. Falls back to a generic link, which is always safe.
function kindFromUrl(url, name = '') {
  const u = (url || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (u.includes('figma.com'))                              return 'figma';
  if (u.includes('docs.google.com') || u.includes('drive.google.com')) return 'drive';
  if (u.endsWith('.pdf') || n.endsWith('.pdf'))             return 'pdf';
  if (u.includes('notion.so') || u.includes('notion.site')) return 'doc';
  return 'link';
}

// GET /api/project-attachments?project_id=…
router.get('/', async (req, res) => {
  try {
    let q = supabase().from('project_attachments').select('*').order('position', { ascending: true });
    if (req.query.project_id) q = q.eq('project_id', req.query.project_id);
    const { data, error } = await q;
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/project-attachments
router.post('/', async (req, res) => {
  try {
    const { project_id, url } = req.body;
    const name = req.body.name?.trim();
    if (!project_id)   return res.status(400).json({ error: 'project_id required' });
    if (!url?.trim())  return res.status(400).json({ error: 'url required' });

    const { data: existing, error: readErr } = await supabase()
      .from('project_attachments').select('position')
      .eq('project_id', project_id).order('position', { ascending: false }).limit(1);
    if (readErr) throw readErr;

    const cleanUrl = url.trim();
    const row = {
      project_id,
      url: cleanUrl,
      // An unnamed link is labelled by its host, which beats a blank card
      name: (name || (() => { try { return new URL(cleanUrl).hostname.replace(/^www\./, ''); } catch { return cleanUrl; } })()).slice(0, 120),
      kind: kindFromUrl(cleanUrl, name),
      position: existing?.length ? existing[0].position + 1 : 0
    };

    const { data, error } = await supabase().from('project_attachments').insert(row).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/project-attachments/:id
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase().from('project_attachments').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
