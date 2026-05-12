const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const FIELDS = [
  'handle', 'name', 'platform', 'niche', 'followers', 'email', 'status',
  'tier', 'video_count', 'start_date', 'per_vid_rate',
  'content_submitted', 'gmv', 'commission_rate',
  'top_videos', 'blc_videos', 'posting_schedule', 'creator_assessment',
  'content_style', 'audience_demographics', 'notes', 'affiliate_type',
  // onboarding checklist fields
  'payment_sent', 'payment_sent_date', 'invoice_received',
  'serum_shipped', 'serum_ship_date',
  'brief_sent', 'creative_angles_sent', 'posting_schedule_confirmed'
];

const JSON_FIELDS = ['top_videos', 'blc_videos', 'posting_schedule'];
const BOOL_FIELDS = ['payment_sent', 'invoice_received', 'serum_shipped',
                     'brief_sent', 'creative_angles_sent', 'posting_schedule_confirmed'];

function buildRosterRecord(body) {
  const rec = {};
  for (const f of FIELDS) {
    if (body[f] === undefined) continue;
    if (f === 'handle') rec.handle = String(body.handle).replace(/^@/, '').trim();
    else if (['followers', 'video_count', 'content_submitted'].includes(f))
      rec[f] = body[f] !== '' && body[f] !== null ? parseInt(body[f]) : null;
    else if (['gmv', 'commission_rate', 'per_vid_rate'].includes(f))
      rec[f] = body[f] !== '' && body[f] !== null ? parseFloat(body[f]) : null;
    else if (JSON_FIELDS.includes(f))
      rec[f] = Array.isArray(body[f]) ? body[f] : (body[f] ? JSON.parse(body[f]) : []);
    else if (BOOL_FIELDS.includes(f))
      rec[f] = body[f] === true || body[f] === 'true';
    else rec[f] = body[f] !== '' ? body[f] : null;
  }
  return rec;
}

// After saving, auto-graduate from onboarding → active when all tasks complete
async function checkAutoGraduate(id) {
  const { data } = await supabase.from('roster').select('*').eq('id', id).single();
  if (!data || data.status !== 'onboarding') return data;
  const done = data.payment_sent && data.serum_shipped &&
               data.brief_sent && data.creative_angles_sent && data.posting_schedule_confirmed;
  if (!done) return data;
  const { data: grad } = await supabase
    .from('roster').update({ status: 'active' }).eq('id', id).select().single();
  return grad || data;
}

// GET all
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

// POST create
router.post('/', async (req, res) => {
  try {
    if (!req.body.handle) return res.status(400).json({ error: 'Handle is required' });
    const rec = buildRosterRecord(req.body);
    if (!rec.status)   rec.status   = 'active';
    if (!rec.platform) rec.platform = 'TikTok';
    if (!rec.top_videos) rec.top_videos = [];

    const { data, error } = await supabase
      .from('roster')
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
    const updates = buildRosterRecord(req.body);
    // Auto-stamp dates
    if (updates.payment_sent === true && !updates.payment_sent_date)
      updates.payment_sent_date = new Date().toISOString().split('T')[0];
    if (updates.serum_shipped === true && !updates.serum_ship_date)
      updates.serum_ship_date = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('roster')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    // Check if all onboarding tasks are done → graduate to active
    const final = await checkAutoGraduate(req.params.id);
    res.json(final || data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE
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
