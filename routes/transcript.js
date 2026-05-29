const express = require('express');
const router = express.Router();

// POST /api/transcript  { url }
// Calls Supadata API for TikTok/Instagram/YouTube transcripts.
// Requires: SUPADATA_API_KEY env var
router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const apiKey = process.env.SUPADATA_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'Add SUPADATA_API_KEY to Railway environment variables'
    });
  }

  try {
    const transcript = await fetchFromSupadata(url, apiKey);
    res.json({ transcript });
  } catch (err) {
    const msg = err.message || 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// ── Supadata Transcript API ───────────────────────────────────────────────────
// Docs: https://docs.supadata.ai
// Simple GET request — supports TikTok, YouTube, Instagram, etc.
async function fetchFromSupadata(videoUrl, apiKey) {
  const endpoint = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(videoUrl)}&text=true`;

  const res = await fetch(endpoint, {
    headers: { 'x-api-key': apiKey }
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supadata error ${res.status}: ${body}`);
  }

  const data = await res.json();

  // Async job — poll until complete (max ~30s)
  if (data.jobId) {
    return await pollJob(data.jobId, apiKey);
  }

  // Synchronous response
  if (!data.content) throw new Error('No transcript returned — video may have no captions');
  return typeof data.content === 'string'
    ? data.content.trim()
    : data.content.map(c => c.text || '').join(' ').trim();
}

async function pollJob(jobId, apiKey, maxAttempts = 12, intervalMs = 2500) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    const res = await fetch(`https://api.supadata.ai/v1/transcript/${jobId}`, {
      headers: { 'x-api-key': apiKey }
    });
    if (!res.ok) throw new Error(`Supadata job poll error: HTTP ${res.status}`);
    const data = await res.json();
    if (data.status === 'completed') {
      if (!data.content) throw new Error('No transcript returned — video may have no captions');
      return typeof data.content === 'string'
        ? data.content.trim()
        : data.content.map(c => c.text || '').join(' ').trim();
    }
    if (data.status === 'failed') {
      throw new Error(data.error?.message || 'Supadata transcript job failed');
    }
    // status: queued | active — keep polling
  }
  throw new Error('Transcript timed out — try again in a moment');
}

module.exports = router;
