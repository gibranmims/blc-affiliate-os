const express = require('express');
const router = express.Router();

// POST /api/transcript  { url }
// Fetches the transcript for a TikTok video URL via:
//   1. Anthropic API + TokScript remote MCP  (requires ANTHROPIC_API_KEY + TOKSCRIPT_TOKEN)
//   2. Returns 503 with instructions if not configured
router.post('/', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  const anthropicKey   = process.env.ANTHROPIC_API_KEY;
  const tokscriptToken = process.env.TOKSCRIPT_TOKEN;

  if (!anthropicKey || anthropicKey === 'your_anthropic_api_key_here') {
    return res.status(503).json({
      error: 'not_configured',
      message: 'Add ANTHROPIC_API_KEY to Railway environment variables'
    });
  }
  if (!tokscriptToken) {
    return res.status(503).json({
      error: 'no_tokscript_token',
      message: 'Add TOKSCRIPT_TOKEN to Railway environment variables. Get your token from tokscript.com → Account → API Settings.'
    });
  }

  try {
    // Call Anthropic API with TokScript as a remote MCP server
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       anthropicKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta':  'mcp-client-2025-04-04'
      },
      body: JSON.stringify({
        model:      'claude-haiku-20240307',
        max_tokens: 4096,
        tools: [{
          type:                'mcp',
          server_label:        'tokscript',
          server_url:          'https://api.tokscript.com/mcp',
          authorization_token: tokscriptToken,
          allowed_tools:       ['get_tiktok_transcript']
        }],
        messages: [{
          role:    'user',
          content: `Use the get_tiktok_transcript tool to get the transcript from this TikTok video: ${url}

After getting the transcript, return ONLY the plain spoken text — no timestamps, no segment labels, no formatting. Just the words spoken in the video, in order.`
        }]
      })
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || `Anthropic API error ${response.status}`);
    }

    const data = await response.json();

    // Pull the final text block from the response
    let transcript = '';
    for (const block of (data.content || [])) {
      if (block.type === 'text') transcript += block.text + '\n';
    }
    transcript = transcript.trim();

    if (!transcript) throw new Error('No transcript returned — video may not have captions');
    res.json({ transcript });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
