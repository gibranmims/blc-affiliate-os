const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const APP_KEY = process.env.TIKTOK_APP_KEY;
const APP_SECRET = process.env.TIKTOK_APP_SECRET;

// ── Signing ────────────────────────────────────────────────────
function signParams(params) {
  const base = Object.keys(params)
    .filter(k => k !== 'sign' && k !== 'access_token')
    .sort()
    .map(k => `${k}${params[k]}`)
    .join('');
  return crypto.createHmac('sha256', APP_SECRET).update(base).digest('hex');
}

// ── Token storage ──────────────────────────────────────────────
async function getStoredToken() {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'tiktok_token')
    .single();
  return data?.value || null;
}

async function saveToken(tokenData) {
  await supabase
    .from('app_settings')
    .upsert({ key: 'tiktok_token', value: tokenData });
}

async function getValidToken() {
  const token = await getStoredToken();
  if (!token) return null;
  const expiresAt = token.saved_at + ((token.expires_in - 300) * 1000);
  if (Date.now() > expiresAt && token.refresh_token) {
    const ts = Math.floor(Date.now() / 1000).toString();
    const params = { app_key: APP_KEY, grant_type: 'refresh_token', refresh_token: token.refresh_token, timestamp: ts };
    params.sign = signParams(params);
    const resp = await fetch(`https://auth.tiktok-shops.com/api/v2/token/refresh?${new URLSearchParams(params)}`);
    const result = await resp.json();
    if (result.code !== 0) return null;
    const next = {
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token,
      expires_in: result.data.expires_in,
      saved_at: Date.now()
    };
    await saveToken(next);
    return next;
  }
  return token;
}

// ── Shop API call ──────────────────────────────────────────────
async function shopAPI(path, method, token, body = {}) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signSource = { app_key: APP_KEY, timestamp, ...body };
  const signature = signParams(signSource);
  const qs = new URLSearchParams({ app_key: APP_KEY, timestamp, sign: signature }).toString();
  const url = `https://open-api.tiktokshop.com${path}?${qs}&access_token=${token.access_token}`;
  const resp = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: method !== 'GET' ? JSON.stringify(body) : undefined
  });
  return resp.json();
}

// ── Routes ─────────────────────────────────────────────────────

// GET /api/tiktok/auth — start OAuth
router.get('/auth', (req, res) => {
  if (!APP_KEY) return res.status(500).send('TIKTOK_APP_KEY not configured');
  res.redirect(`https://auth.tiktok-shops.com/oauth/authorize?app_key=${APP_KEY}&state=blc`);
});

// GET /api/tiktok/callback — exchange code for token
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect('/?page=roster&tiktok=error');
  try {
    const ts = Math.floor(Date.now() / 1000).toString();
    const params = { app_key: APP_KEY, auth_code: code, grant_type: 'authorized_code', timestamp: ts };
    params.sign = signParams(params);
    const resp = await fetch(`https://auth.tiktok-shops.com/api/v2/token/get?${new URLSearchParams(params)}`);
    const result = await resp.json();
    if (result.code !== 0) throw new Error(result.message || JSON.stringify(result));
    await saveToken({
      access_token: result.data.access_token,
      refresh_token: result.data.refresh_token,
      expires_in: result.data.expires_in,
      saved_at: Date.now()
    });
    res.redirect('/?page=roster&tiktok=connected');
  } catch (err) {
    console.error('TikTok callback error:', err);
    res.redirect('/?page=roster&tiktok=error');
  }
});

// GET /api/tiktok/status
router.get('/status', async (req, res) => {
  const token = await getStoredToken();
  if (!token) return res.json({ connected: false });
  const expired = Date.now() > token.saved_at + (token.expires_in * 1000);
  res.json({ connected: true, expired });
});

// POST /api/tiktok/sync — pull affiliate orders, update roster GMV
router.post('/sync', async (req, res) => {
  try {
    const token = await getValidToken();
    if (!token) return res.status(401).json({ error: 'TikTok Shop not connected' });

    const now = Math.floor(Date.now() / 1000);
    const start = now - 90 * 24 * 60 * 60;

    const result = await shopAPI('/affiliate/202309/orders/search', 'POST', token, {
      create_time_ge: start,
      create_time_lt: now,
      page_size: 100
    });

    console.log('[TikTok sync] API response code:', result.code, 'message:', result.message);

    if (result.code !== 0) throw new Error(result.message || `API error ${result.code}`);

    const orders = result.data?.orders || [];
    const gmvMap = {};
    for (const order of orders) {
      const handle = (order.affiliate_unique_id || order.creator_handle || '')
        .replace('@', '').toLowerCase().trim();
      if (!handle) continue;
      const amount = parseFloat(order.settle_amount ?? order.revenue_amount ?? 0);
      gmvMap[handle] = (gmvMap[handle] || 0) + amount;
    }

    const { data: roster } = await supabase.from('roster').select('id, handle');
    let updated = 0;
    for (const creator of (roster || [])) {
      const key = creator.handle.replace('@', '').toLowerCase().trim();
      if (gmvMap[key] !== undefined) {
        await supabase.from('roster').update({ gmv: gmvMap[key] }).eq('id', creator.id);
        updated++;
      }
    }

    res.json({ success: true, updated, total_orders: orders.length });
  } catch (err) {
    console.error('[TikTok sync] error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
