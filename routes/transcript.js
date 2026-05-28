const express = require('express');
const router = express.Router();

// POST /api/transcript  { url }
// Calls TokScript MCP via JSON-RPC over HTTP+SSE (no Anthropic needed).
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
    const msg = err.message || 'Unknown error';
    res.status(500).json({
      error: msg,
      isLimit: msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('upgrade')
    });
  }
});

// ── TokScript MCP (JSON-RPC over HTTP+SSE) ────────────────────────────────────
// MCP protocol requires: initialize → notifications/initialized → tools/call
async function mcpPost(token, body) {
  const r = await fetch('https://api.tokscript.com/mcp', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json, text/event-stream'
    },
    body: JSON.stringify(body)
  });
  return r;
}

function parseSseJson(raw) {
  const line = raw.split('\n').find(l => l.startsWith('data: '));
  if (!line) throw new Error('Unexpected TokScript response format');
  try { return JSON.parse(line.slice(6)); }
  catch { throw new Error('Could not parse TokScript response'); }
}

async function fetchFromTokScript(videoUrl, token) {
  // 1. Initialize
  const initRes = await mcpPost(token, {
    jsonrpc: '2.0', id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'blc-affiliate-os', version: '1.0' }
    }
  });
  if (!initRes.ok) throw new Error(`TokScript init failed: HTTP ${initRes.status}`);
  await initRes.text(); // consume body

  // 2. Send initialized notification (fire and forget — 202 response)
  await mcpPost(token, { jsonrpc: '2.0', method: 'notifications/initialized' });

  // 3. Call the tool
  const callRes = await mcpPost(token, {
    jsonrpc: '2.0', id: 2,
    method: 'tools/call',
    params: {
      name:      'get_tiktok_transcript',
      arguments: { video_url: videoUrl, format: 'text' }
    }
  });
  if (!callRes.ok) throw new Error(`TokScript returned HTTP ${callRes.status}`);

  const payload = parseSseJson(await callRes.text());

  if (payload.error) throw new Error(payload.error.message || 'TokScript JSON-RPC error');

  const content = payload.result?.content;
  if (payload.result?.isError) throw new Error(content?.[0]?.text || 'TokScript error');
  if (!content?.length)        throw new Error('No transcript returned — video may have no captions');

  return content.map(c => c.text || '').join(' ').trim();
}

module.exports = router;
