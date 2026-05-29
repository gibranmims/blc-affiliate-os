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
// Fetches caption chunks (not plain text) so each chunk = one delivery line.
// The result is double-spaced line-by-line, matching the video's spoken cadence.
async function fetchFromSupadata(videoUrl, apiKey) {
  // No text=true — we want chunks so we can preserve per-line cadence
  const endpoint = `https://api.supadata.ai/v1/transcript?url=${encodeURIComponent(videoUrl)}`;

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
  return formatChunks(data.content);
}

// Each caption chunk is one spoken line — join with double newline for cadence spacing
function formatChunks(content) {
  if (typeof content === 'string') {
    // Plain text fallback — split on sentence endings
    return content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(Boolean)
      .join('\n\n');
  }
  return content
    .map(c => (c.text || '').trim())
    .filter(Boolean)
    .join('\n\n');
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
      return formatChunks(data.content);
    }
    if (data.status === 'failed') {
      throw new Error(data.error?.message || 'Supadata transcript job failed');
    }
    // status: queued | active — keep polling
  }
  throw new Error('Transcript timed out — try again in a moment');
}

module.exports = router;
