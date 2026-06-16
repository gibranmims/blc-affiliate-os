const express = require('express');
const router = express.Router();

const EUKA_BASE = 'https://api.euka.ai/v0';
const getKey = () => process.env.EUKA_API_KEY;

let _storeId = null;

async function getStoreId() {
  if (_storeId) return _storeId;
  const res = await fetch(`${EUKA_BASE}/stores`, {
    headers: { Authorization: `Bearer ${getKey()}` }
  });
  if (!res.ok) throw new Error(`Euka /stores returned ${res.status}`);
  const stores = await res.json();
  if (!Array.isArray(stores) || stores.length === 0) throw new Error('No Euka stores found');
  _storeId = stores[0].id;
  return _storeId;
}

function monthRange(month) {
  const [year, mon] = month.split('-').map(Number);
  const start = `${year}-${String(mon).padStart(2, '0')}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const end = `${year}-${String(mon).padStart(2, '0')}-${lastDay}`;
  return { start, end };
}

// GET /api/euka/creators?month=2026-06
// Returns creator-level stats for the given month
router.get('/creators', async (req, res) => {
  const key = getKey();
  if (!key) return res.status(503).json({ error: 'EUKA_API_KEY not configured' });

  const { month } = req.query;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ error: 'month required (YYYY-MM)' });
  }

  try {
    const storeId = await getStoreId();
    const { start, end } = monthRange(month);
    const url = `${EUKA_BASE}/data-export?type=creator_level&store_id=${storeId}&start_date=${start}&end_date=${end}&export_type=json`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({ error: `Euka error ${r.status}`, detail: body });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/euka/creator-videos?handle=clairesmust&month=2026-06
// Returns all videos for a specific creator in the given month
router.get('/creator-videos', async (req, res) => {
  const key = getKey();
  if (!key) return res.status(503).json({ error: 'EUKA_API_KEY not configured' });

  const { handle, month } = req.query;
  if (!handle || !month) return res.status(400).json({ error: 'handle and month required' });

  try {
    const storeId = await getStoreId();
    const { start, end } = monthRange(month);
    const cleanHandle = handle.replace(/^@/, '');
    const url = `${EUKA_BASE}/data-export?type=creator_video_level&store_id=${storeId}&creator_handle=${encodeURIComponent(cleanHandle)}&start_date=${start}&end_date=${end}&export_type=json`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (!r.ok) {
      const body = await r.text();
      return res.status(r.status).json({ error: `Euka error ${r.status}`, detail: body });
    }
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/euka/store — returns store info (for debugging / setup verification)
router.get('/store', async (req, res) => {
  const key = getKey();
  if (!key) return res.status(503).json({ error: 'EUKA_API_KEY not configured' });
  try {
    const r = await fetch(`${EUKA_BASE}/stores`, { headers: { Authorization: `Bearer ${key}` } });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
