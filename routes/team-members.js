const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { uploadPhoto, signedUrl } = require('../lib/storage');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// tasks.assignee stores this key, so it has to be URL/identifier-safe and
// stable — the name can change freely afterwards without touching tasks.
function slugify(name) {
  return name.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'member';
}

function initialsFrom(name) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

// GET /api/team-members
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase()
      .from('team_members')
      .select('*')
      .order('position', { ascending: true });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team-members
router.post('/', async (req, res) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ error: 'Name required' });

    const db = supabase();
    const { data: existing, error: readErr } = await db
      .from('team_members')
      .select('member_key, position');
    if (readErr) throw readErr;

    // Keys must be unique — walk a suffix if the slug is taken
    const taken = new Set((existing || []).map(m => m.member_key));
    let key = slugify(name), n = 2;
    while (taken.has(key)) key = `${slugify(name)}-${n++}`;

    const position = existing?.length ? Math.max(...existing.map(m => m.position)) + 1 : 0;

    const { data, error } = await db
      .from('team_members')
      .insert({
        member_key: key,
        name: name.slice(0, 60),
        initials: (req.body.initials?.trim() || initialsFrom(name)).slice(0, 3),
        position
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/team-members/:id — member_key is deliberately immutable so the
// tasks already pointing at it never orphan.
router.put('/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) {
      const name = req.body.name.trim();
      if (!name) return res.status(400).json({ error: 'Name required' });
      updates.name = name.slice(0, 60);
    }
    if (req.body.initials !== undefined) updates.initials = req.body.initials.trim().slice(0, 3) || null;
    if (req.body.active   !== undefined) updates.active   = !!req.body.active;
    if (req.body.position !== undefined) updates.position = req.body.position;

    const { data, error } = await supabase()
      .from('team_members')
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

// DELETE /api/team-members/:id
// Refuses while work is still assigned — deleting would strand those tasks
// in a column that no longer renders. Deactivate instead.
router.delete('/:id', async (req, res) => {
  try {
    const db = supabase();
    const { data: member, error: findErr } = await db
      .from('team_members').select('*').eq('id', req.params.id).single();
    if (findErr) throw findErr;

    const { count, error: countErr } = await db
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('assignee', member.member_key)
      .eq('archived', false);
    if (countErr) throw countErr;

    if (count > 0) {
      return res.status(409).json({
        error: `${member.name} still has ${count} task${count === 1 ? '' : 's'}. Reassign or archive them first, or set them inactive instead.`
      });
    }

    const { error } = await db.from('team_members').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/team-members/:id/photo — upload/replace headshot
router.post('/:id/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No photo uploaded' });
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'File must be an image' });
    }

    const db = supabase();
    const { data: member, error: findErr } = await db
      .from('team_members').select('id').eq('id', req.params.id).single();
    if (findErr || !member) return res.status(404).json({ error: 'Team member not found' });

    const ext = (req.file.mimetype.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const storagePath = `team-members/${req.params.id}.${ext}`;
    await uploadPhoto(req.file.buffer, storagePath, req.file.mimetype);

    const { data, error } = await db
      .from('team_members')
      .update({ photo_path: storagePath })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/team-members/:id/photo — proxy through a fresh signed URL
// (challenge-photos is a private bucket, so nothing gets a durable public URL)
router.get('/:id/photo', async (req, res) => {
  try {
    const { data: member, error } = await supabase()
      .from('team_members').select('photo_path').eq('id', req.params.id).single();
    if (error || !member?.photo_path) return res.status(404).end();
    const url = await signedUrl(member.photo_path, 3600);
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
