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
  'status', 'generated_email', 'sender',
  'asked_rate_3', 'asked_rate_5', 'asked_rate_10', 'asked_rate_custom', 'asked_rate_custom_count',
  'product_fit', 'on_camera_energy', 'production_quality', 'viral_track_record', 'viral_potential', 'sales_structure',
  'on_camera', 'feels_natural', 'tier', 'evaluation_notes',
  'founder_product_fit', 'founder_on_camera_energy', 'founder_production_quality',
  'founder_viral_track_record', 'founder_viral_potential', 'founder_sales_structure',
  'founder_tier',
  'counter_offer_amount', 'counter_offer_email', 'counter_feedback',
  'founder_counter_amount', 'founder_counter_notes',
  'video_count', 'start_date',
  'sent_date', 'followup1_date', 'followup1_sent', 'followup1_sent_date',
  'followup2_date', 'followup2_sent', 'followup2_sent_date',
  'payment_sent', 'payment_sent_date'
];

const BOOL_FIELDS  = ['followup1_sent', 'followup2_sent', 'payment_sent'];
const DATE_FIELDS  = ['sent_date', 'followup1_date', 'followup1_sent_date', 'followup2_date', 'followup2_sent_date', 'start_date'];
const INT_FIELDS   = ['follower_count', 'video_count', 'asked_rate_custom_count'];
const FLOAT_FIELDS = ['last_30d_gmv', 'asked_rate_3', 'asked_rate_5', 'asked_rate_10', 'asked_rate_custom', 'counter_offer_amount', 'founder_counter_amount'];

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function buildRecord(body) {
  const rec = {};
  for (const f of FIELDS) {
    if (body[f] === undefined) continue;
    if (f === 'handle')              rec.handle = String(body.handle).replace(/^@/, '').trim();
    else if (BOOL_FIELDS.includes(f)) rec[f] = body[f] === true || body[f] === 'true';
    else if (INT_FIELDS.includes(f))  rec[f] = body[f] !== '' && body[f] !== null ? parseInt(body[f]) : null;
    else if (FLOAT_FIELDS.includes(f)) rec[f] = body[f] !== '' && body[f] !== null ? parseFloat(body[f]) : null;
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

    // When moving to "sent", auto-set dates if not already set
    if (updates.status === 'sent' && !updates.sent_date) {
      const { data: current } = await supabase
        .from('outreach')
        .select('sent_date')
        .eq('id', req.params.id)
        .single();

      if (!current?.sent_date) {
        const t = today();
        updates.sent_date      = t;
        updates.followup1_date = addDays(t, 4);
        updates.followup2_date = addDays(t, 8);
      }
    }

    // When marking a follow-up sent, record today's date automatically
    if (updates.followup1_sent === true && !updates.followup1_sent_date) {
      updates.followup1_sent_date = today();
    }
    if (updates.followup2_sent === true && !updates.followup2_sent_date) {
      updates.followup2_sent_date = today();
    }
    if (updates.payment_sent === true && !updates.payment_sent_date) {
      updates.payment_sent_date = today();
    }

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
