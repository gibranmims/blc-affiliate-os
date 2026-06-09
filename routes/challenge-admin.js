const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { signedUrl } = require('../lib/storage');
const email = require('../lib/email');

const router = express.Router();

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// ── GET /api/challenge/challengers ───────────────────────────────
// Returns all challengers with their check-in rows

router.get('/challengers', async (req, res) => {
  try {
    const db = supabase();
    const { data: challengers, error } = await db
      .from('challengers')
      .select(`
        *,
        challenge_checkins (
          id, week_number, token, window_opens_at, window_closes_at,
          grace_closes_at, submitted_at, used_consistently, notes,
          is_strong_content, photo_url, drive_file_id,
          reminder_sent_at, warning_sent_at
        )
      `)
      .order('signup_date', { ascending: false });
    if (error) throw error;
    res.json(challengers || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/challenge/checkins/:id/flag ─────────────────────────
// Toggle is_strong_content on a check-in row

router.put('/checkins/:id/flag', async (req, res) => {
  try {
    const db = supabase();
    const { data: current, error: fetchErr } = await db
      .from('challenge_checkins')
      .select('is_strong_content')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !current) return res.status(404).json({ error: 'Check-in not found' });

    const { data, error } = await db
      .from('challenge_checkins')
      .update({ is_strong_content: !current.is_strong_content })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/challenge/checkins/:id/photo ────────────────────────
// Returns a signed URL for a check-in photo (1-hour expiry)

router.get('/checkins/:id/photo', async (req, res) => {
  try {
    const db = supabase();
    const { data: checkin, error } = await db
      .from('challenge_checkins')
      .select('photo_url')
      .eq('id', req.params.id)
      .single();
    if (error || !checkin?.photo_url) return res.status(404).json({ error: 'Photo not found' });
    const url = await signedUrl(checkin.photo_url);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/challenge/challengers/:id/week0-photo ───────────────
// Returns a signed URL for the week 0 before photo

router.get('/challengers/:id/week0-photo', async (req, res) => {
  try {
    const db = supabase();
    const { data: challenger, error } = await db
      .from('challengers')
      .select('week0_photo_url')
      .eq('id', req.params.id)
      .single();
    if (error || !challenger?.week0_photo_url) return res.status(404).json({ error: 'Photo not found' });
    const url = await signedUrl(challenger.week0_photo_url);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/challenge/challengers/:id/approve-refund ───────────

router.post('/challengers/:id/approve-refund', async (req, res) => {
  try {
    const db = supabase();
    const { data: challenger, error: fetchErr } = await db
      .from('challengers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !challenger) return res.status(404).json({ error: 'Challenger not found' });
    if (challenger.status !== 'completed') {
      return res.status(400).json({ error: 'Challenger has not completed all check-ins' });
    }

    const { data, error } = await db
      .from('challengers')
      .update({ status: 'refund_approved' })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;

    try {
      await email.notifyTeamRefundApproved(challenger);
    } catch (e) { console.error('Refund email failed (non-fatal):', e.message); }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
