// ============================================================
// Pro Partner Applications
//
// People who applied to the Pro Partner Network. The applications live in
// the partner portal's own database; this route reads them live over the
// portal API (shared secret) and merges the OS's own overlay — notes and
// whether you've personally reached out. Nothing is synced or copied, so
// the tracker can never fall out of step with the portal.
// ============================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

const PORTAL_URL = (process.env.PARTNER_PORTAL_URL || 'https://partners.thebikiniline.co').replace(/\/$/, '');

async function portal(path, options = {}) {
  if (!process.env.PARTNER_SYNC_SECRET) {
    throw new Error('PARTNER_SYNC_SECRET is not set on the OS — add it in Railway (same value as the portal)');
  }
  const res = await fetch(`${PORTAL_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-blc-secret': process.env.PARTNER_SYNC_SECRET,
      ...(options.headers || {}),
    },
  });
  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Portal returned ${res.status} (not JSON) — is the portal deployed?`);
  }
  if (!res.ok) throw new Error(data.error || `Portal request failed (${res.status})`);
  return data;
}

// GET /api/partner-applications — the merged tracker
router.get('/', async (req, res) => {
  try {
    const applications = await portal('/api/partner-funnel');

    // Overlay is additive: if the table hasn't been created yet the tracker
    // still renders the funnel, just without notes. Losing the applications
    // over a missing notes table would be the worse failure.
    const { data: overlay, error } = await supabase().from('partner_app_notes').select('*');
    if (error) console.warn('[partner-applications] overlay unavailable:', error.message);
    const byId = new Map((overlay || []).map(o => [o.portal_application_id, o]));

    res.json(applications.map(a => {
      const o = byId.get(a.id) || {};
      return {
        ...a,
        notes: o.notes || '',
        reached_out: !!o.reached_out,
        reached_out_at: o.reached_out_at || null,
      };
    }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/partner-applications/:id — the OS's own overlay fields
router.patch('/:id', async (req, res) => {
  try {
    const row = { portal_application_id: req.params.id, updated_at: new Date().toISOString() };
    if (req.body.notes !== undefined) row.notes = String(req.body.notes || '').trim() || null;
    if (req.body.reached_out !== undefined) {
      row.reached_out = !!req.body.reached_out;
      row.reached_out_at = row.reached_out ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase()
      .from('partner_app_notes')
      .upsert(row, { onConflict: 'portal_application_id' })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/partner-applications/:id/approve — approve without leaving the OS.
// The portal does the real work: issues the invite code and emails the
// applicant their code, register link, and Skool invite.
router.post('/:id/approve', async (req, res) => {
  try {
    const result = await portal('/api/approve-application', {
      method: 'POST',
      body: JSON.stringify({ application_id: req.params.id }),
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
