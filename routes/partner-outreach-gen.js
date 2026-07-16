const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');

// Fills a template's {{name}}/{{studio}}/{{detail}} placeholders with lead data.
// Pure string substitution — the assistant still copies this into Instagram by hand,
// so no AI call is needed for the common case.
router.post('/generate', async (req, res) => {
  try {
    const { template_body, esthetician_name, studio_name, found_detail } = req.body;
    if (!template_body) return res.status(400).json({ error: 'template_body is required' });

    const filled = template_body
      .replace(/\{\{\s*name\s*\}\}/gi, esthetician_name || 'there')
      .replace(/\{\{\s*studio\s*\}\}/gi, studio_name || 'your studio')
      .replace(/\{\{\s*detail\s*\}\}/gi, found_detail || 'your work');

    res.json({ message: filled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// One-time authoring aid: have Claude draft the initial 3-5 template variants
// from a short brief, for the assistant to review/edit — not a per-lead generator.
router.post('/suggest-templates', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { brief, count } = req.body;
  const n = Math.min(Math.max(parseInt(count) || 5, 1), 5);

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: `Write ${n} short Instagram DM outreach message variants inviting a licensed wax specialist / esthetician to apply to The Bikini Line Co.'s "Pro Partner Network" — a licensed-only affiliate tier at 40% commission for recommending BBL Serum (a post-wax skincare product) on social content.

${brief ? `Additional context: ${brief}` : ''}

Rules:
- Each variant must use the placeholders {{name}}, {{studio}}, and {{detail}} somewhere natural (first name, their studio name, and one specific noticed detail like a recent post).
- Keep each message under 5 short sentences. Warm, direct, human — not corny or AI-sounding.
- Never use em dashes or en dashes.
- Do not describe the product in detail — this is an invite to apply, not a sales pitch.
- End each with a soft call to action to apply (no hard link needed, just an invite to learn more).
- Output ONLY a JSON array of ${n} objects, each shaped like {"name": "Variant A - short label", "body": "the message text"}. No other text.`
      }]
    });

    const text = msg.content[0].text.trim();
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const templates = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
