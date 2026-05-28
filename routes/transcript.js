const express = require('express');
const router = express.Router();

// POST /api/transcript  { url }
// Calls TokScript MCP directly via JSON-RPC over HTTP (no Anthropic needed).
// Requires: TOKSCRIPT_TOKEN env var
router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const token = process.env.TOKSCRIPT_TOKEN;
  if (!token) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'Add TOKSCRIPT_TOKEN to Railway environment variables'
    });
  }

  try {
    const transcript = await fetchFromTokScript(url, token);
    res.json({ transcript });
  } catch (err) {
    // Send user-friendly message for known limit/plan errors
    const msg = err.message || 'Unknown error';
    res.status(500).json({
      error: msg,
      isLimit: msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('upgrade')
    });
  }
});

// ── TokScript MCP (JSON-RPC over HTTP+SSE) ────────────────────────────────────
async function fetchFromTokScript(videoUrl, token) {
  const response = await fetch('https://api.tokscript.com/mcp', {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${token}`,
      'Content-Type':   'application/json',
      'Accept':         'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id:      Date.now(),
      method:  'tools/call',
      params:  {
        name:      'get_tiktok_transcript',
        arguments: { video_url: videoUrl, format: 'text' }
      }
    })
  });

  if (!response.ok) {
    throw new Error(`TokScript returned HTTP ${response.status}`);
  }

  // Response is SSE — find the "data: {...}" line
  const raw = await response.text();
  const dataLine = raw.split('\n').find(l => l.startsWith('data: '));
  if (!dataLine) throw new Error('Unexpected TokScript response format');

  let payload;
  try { payload = JSON.parse(dataLine.slice(6)); }
  catch { throw new Error('Could not parse TokScript response'); }

  if (payload.error) {
    throw new Error(payload.error.message || 'TokScript JSON-RPC error');
  }

  const content = payload.result?.content;
  if (payload.result?.isError) {
    throw new Error(content?.[0]?.text || 'TokScript returned an error');
  }
  if (!content?.length) {
    throw new Error('No transcript returned — video may have no captions');
  }

  return content.map(c => c.text || '').join(' ').trim();
}

module.exports = router;
