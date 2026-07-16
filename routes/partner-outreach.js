const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const FIELDS = [
  'ig_handle', 'studio_name', 'esthetician_name', 'city', 'region',
  'profile_url', 'source_tag', 'found_detail', 'follower_count',
  'status', 'template_id',
  'contacted_date', 'followup_due_date', 'followup_sent_date',
  'replied_date', 'applied_date', 'accepted_date', 'portal_applied',
  'notes'
];
const BOOL_FIELDS = ['portal_applied'];
const DATE_FIELDS = ['contacted_date', 'followup_due_date', 'followup_sent_date', 'replied_date', 'applied_date', 'accepted_date'];
const INT_FIELDS  = ['follower_count'];

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
    if (f === 'ig_handle')             rec.ig_handle = String(body.ig_handle).replace(/^@/, '').trim();
    else if (BOOL_FIELDS.includes(f))  rec[f] = body[f] === true || body[f] === 'true';
    else if (DATE_FIELDS.includes(f))  rec[f] = body[f] !== '' ? body[f] : null;
    else if (INT_FIELDS.includes(f))   rec[f] = body[f] !== '' && body[f] !== null ? parseInt(body[f]) : null;
    else rec[f] = body[f] !== '' ? body[f] : null;
  }
  return rec;
}

// GET all leads
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('partner_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create lead
router.post('/', async (req, res) => {
  try {
    if (!req.body.ig_handle) return res.status(400).json({ error: 'ig_handle is required' });
    const rec = buildRecord(req.body);
    if (!rec.status) rec.status = 'not_contacted';

    const { data, error } = await supabase
      .from('partner_leads')
      .insert([rec])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update lead — auto-set dates on status transitions
router.put('/:id', async (req, res) => {
  try {
    const updates = buildRecord(req.body);

    if (updates.status) {
      const { data: current } = await supabase
        .from('partner_leads')
        .select('contacted_date, replied_date, applied_date, accepted_date')
        .eq('id', req.params.id)
        .single();

      if (updates.status === 'contacted' && !current?.contacted_date && !updates.contacted_date) {
        const t = today();
        updates.contacted_date    = t;
        updates.followup_due_date = addDays(t, 4);
      }
      if (updates.status === 'replied' && !current?.replied_date && !updates.replied_date) {
        updates.replied_date = today();
      }
      if (updates.status === 'applied') {
        if (!current?.applied_date && !updates.applied_date) updates.applied_date = today();
        updates.portal_applied = true;
      }
      if (updates.status === 'accepted' && !current?.accepted_date && !updates.accepted_date) {
        updates.accepted_date = today();
      }
    }

    const { data, error } = await supabase
      .from('partner_leads')
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

// DELETE lead
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('partner_leads')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DM Templates ──────────────────────────────────────────────

router.get('/templates', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('partner_dm_templates')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const { name, body, active } = req.body;
    if (!name || !body) return res.status(400).json({ error: 'name and body are required' });

    const { data, error } = await supabase
      .from('partner_dm_templates')
      .insert([{ name, body, active: active !== false }])
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.body !== undefined) updates.body = req.body.body;
    if (req.body.active !== undefined) updates.active = req.body.active === true || req.body.active === 'true';

    const { data, error } = await supabase
      .from('partner_dm_templates')
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

router.delete('/templates/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('partner_dm_templates')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CSV bulk import ────────────────────────────────────────────

router.post('/import', upload.single('csv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  let records;
  try {
    records = parse(req.file.buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
  } catch (e) {
    return res.status(400).json({ error: `CSV parse error: ${e.message}` });
  }

  if (records.length === 0) return res.status(400).json({ error: 'CSV has no rows' });
  if (records.length > 500) return res.status(400).json({ error: 'Max 500 leads per import' });

  const normalize = row => {
    const n = {};
    for (const [k, v] of Object.entries(row)) {
      n[k.toLowerCase().trim().replace(/[\s-]+/g, '_')] = (v || '').trim();
    }
    return n;
  };

  const rows = records
    .map(normalize)
    .map(n => ({
      ig_handle:        (n.ig_handle || n.handle || '').replace(/^@/, ''),
      studio_name:      n.studio_name || null,
      esthetician_name: n.esthetician_name || n.name || null,
      city:             n.city || null,
      region:           n.region || n.state || null,
      profile_url:      n.profile_url || null,
      source_tag:       n.source_tag || null,
      found_detail:     n.found_detail || null,
      follower_count:   n.follower_count ? parseInt(n.follower_count) || null : null,
      status:           'not_contacted'
    }))
    .filter(r => r.ig_handle);

  if (rows.length === 0) return res.status(400).json({ error: 'No rows had an ig_handle column' });

  try {
    const { data, error } = await supabase.from('partner_leads').insert(rows).select();
    if (error) throw error;
    res.status(201).json({ imported: data.length, skipped: records.length - rows.length, leads: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Bulk add from a parsed paste-list (client parses the freeform text) ──

router.post('/bulk', async (req, res) => {
  const { leads } = req.body;
  if (!Array.isArray(leads) || leads.length === 0) return res.status(400).json({ error: 'leads array required' });
  if (leads.length > 500) return res.status(400).json({ error: 'Max 500 leads per batch' });

  const rows = leads
    .map(l => {
      const row = {
        ig_handle:        String(l.ig_handle || '').replace(/^@/, '').trim(),
        studio_name:      l.studio_name || null,
        esthetician_name: l.esthetician_name || null,
        city:             l.city || null,
        region:           l.region || null,
        profile_url:      l.profile_url || null,
        source_tag:       l.source_tag || null,
        found_detail:     l.found_detail || null,
        notes:            l.notes || null,
        status:           'not_contacted'
      };
      // Only include follower_count if provided — the column may not exist yet
      // in every environment (added in a later migration), and sending it as
      // null would still trip a "column not found" error on old schemas.
      if (l.follower_count) row.follower_count = parseInt(l.follower_count) || undefined;
      return row;
    })
    .filter(r => r.ig_handle);

  if (rows.length === 0) return res.status(400).json({ error: 'No valid leads (missing ig_handle)' });

  try {
    const { data, error } = await supabase.from('partner_leads').insert(rows).select();
    if (error) throw error;
    res.status(201).json({ imported: data.length, skipped: leads.length - rows.length, leads: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Stats: response/application rate by template and city ──────

router.get('/stats', async (req, res) => {
  try {
    const [{ data: leads, error: leadsErr }, { data: templates, error: tplErr }] = await Promise.all([
      supabase.from('partner_leads').select('*'),
      supabase.from('partner_dm_templates').select('id, name')
    ]);
    if (leadsErr) throw leadsErr;
    if (tplErr) throw tplErr;

    const templateName = id => templates.find(t => t.id === id)?.name || 'Unassigned';

    const rollup = (rows) => {
      const contacted = rows.filter(r => r.status !== 'not_contacted').length;
      const replied    = rows.filter(r => ['replied', 'applied', 'accepted'].includes(r.status)).length;
      const applied     = rows.filter(r => ['applied', 'accepted'].includes(r.status)).length;
      const accepted    = rows.filter(r => r.status === 'accepted').length;
      return {
        contacted, replied, applied, accepted,
        response_rate:    contacted > 0 ? +(replied / contacted).toFixed(3) : 0,
        application_rate: contacted > 0 ? +(applied / contacted).toFixed(3) : 0
      };
    };

    const byTemplateMap = {};
    for (const lead of leads) {
      const key = lead.template_id || 'none';
      if (!byTemplateMap[key]) byTemplateMap[key] = [];
      byTemplateMap[key].push(lead);
    }
    const byTemplate = Object.entries(byTemplateMap).map(([id, rows]) => ({
      template_id: id === 'none' ? null : id,
      template_name: id === 'none' ? 'No template' : templateName(id),
      ...rollup(rows)
    }));

    const byCityMap = {};
    for (const lead of leads) {
      const key = lead.city || 'Unknown';
      if (!byCityMap[key]) byCityMap[key] = [];
      byCityMap[key].push(lead);
    }
    const byCity = Object.entries(byCityMap).map(([city, rows]) => ({ city, ...rollup(rows) }));

    res.json({
      byTemplate,
      byCity,
      overall: rollup(leads)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
