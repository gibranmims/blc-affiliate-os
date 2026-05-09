const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const BLC_SYSTEM_PROMPT = `You are a senior creative strategist for The Bikini Line Co (BLC), a premium intimate skincare brand built for women who refuse to settle for razor bumps, ingrown hairs, or skin that doesn't feel like theirs.

BLC Hero Products:
- **Bikini Line Shave Serum** — silky pre-shave serum that prevents razor bumps and gives a flawless, close shave
- **Ingrown Hair Serum** — targets and dissolves existing ingrown hairs while preventing future ones
- **Brightening Body Oil** — fades hyperpigmentation, dark spots, and uneven tone from shaving/waxing
- **Exfoliating Body Scrub** — gentle exfoliation to prep skin and prevent ingrowns
- **Post-Shave Soothing Gel** — instant calm after any hair removal method (shave, wax, laser)

Brand Voice: Confident. Cheeky. Unapologetically real. BLC doesn't whisper about intimate skincare — we talk about it like it's normal (because it is). Body-positive, science-backed, and never preachy.

Target Audience: Women 18–35 who are fed up with razor bumps, ingrowns, and uneven skin tone. They care about feeling confident in their skin, especially in swimwear, shorts, and intimacy. They trust creators who keep it real.

Affiliate Program: Creators receive a unique discount code (10–20% off for their audience) and earn commission on tracked sales. Content should feel like a genuine recommendation from a friend, not an ad.

When creating briefs or scripts: always tailor content to the creator's specific niche, platform format, and audience — never write generic copy.`;

// ── POST /api/generate/script ──────────────────────────────────
router.post('/script', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const { creatorId, productFocus, scriptLength } = req.body;
  if (!creatorId) return res.status(400).json({ error: 'creatorId is required' });

  try {
    const { data: creator, error } = await supabase
      .from('roster')
      .select('*')
      .eq('id', creatorId)
      .single();

    if (error || !creator) return res.status(404).json({ error: 'Creator not found' });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const lengthGuide = {
      short:  '15–30 seconds. One tight hook, one key benefit, one CTA. No filler.',
      medium: '45–60 seconds. Hook + 2–3 key points + product demo moment + CTA.',
      long:   '2–3 minutes. Hook + personal story/problem setup + product walkthrough + results + CTA.'
    };

    const topVids = Array.isArray(creator.top_videos) && creator.top_videos.length > 0
      ? creator.top_videos.slice(0, 5).map((v, i) => `  ${i + 1}. ${v}`).join('\n')
      : '  None on file';

    const blcVids = Array.isArray(creator.blc_videos) && creator.blc_videos.length > 0
      ? creator.blc_videos.slice(0, 3).map((v, i) => `  ${i + 1}. ${v}`).join('\n')
      : '  None yet — this is a fresh angle';

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2560,
      system: BLC_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Write a ready-to-film video script for this creator:

**Creator Profile:**
- Handle: @${creator.handle}
- Platform: ${creator.platform}
- Tier: ${creator.tier || 'Not set'}
- Niche: ${creator.niche || 'Not specified'}
- Followers: ${creator.followers ? creator.followers.toLocaleString() : 'Unknown'}
- Audience: ${creator.audience_demographics || 'Not specified'}
- Content Style & Voice: ${creator.content_style || 'Not specified'}
- Creator Assessment & BLC Vision: ${creator.creator_assessment || 'Not specified'}
- Notes: ${creator.notes || 'None'}

**Their Top Performing TikTok Shop Videos (study these for tone, pacing, and style):**
${topVids}

**Previous BLC Videos (don't repeat these angles — find a fresh approach):**
${blcVids}

**Script Parameters:**
- Product: ${productFocus || 'Their choice of BLC product based on their audience'}
- Length: ${lengthGuide[scriptLength] || lengthGuide.medium}

Write a complete, ready-to-film script that sounds EXACTLY like @${creator.handle} wrote it themselves. If their style is vulgar or blunt, match that. If they're soft and nurturing, match that. Mirror their natural voice — never corporate, never generic.

Format:

---

## HOOK (0–3 sec)
*[The exact opening line — must stop the scroll cold]*

[Script line]

[ACTION: what they're doing on camera]

---

## BODY
*[Main content — build interest and introduce the product naturally]*

[Script lines — use (beat) for natural pauses]

[ACTION cues in brackets throughout]

---

## PRODUCT MOMENT
*[Show the product — don't just talk about it]*

[Script lines]

[ACTION: specific demo instructions]

---

## CTA
*[Close — real, not salesy]*

[Script line with [CREATOR_CODE] placeholder]

---

## DIRECTOR'S NOTES
**B-roll / Overlay Text:**
- [3–5 specific visual ideas]

**Key visual moments:**
- [What camera should focus on]

**Tone reminders:**
- [2–3 notes to stay authentic to their style]

---

Film-ready. Today. Zero editing needed.`
      }]
    });

    const scriptContent = message.content[0].text;
    const product = productFocus || 'BLC Product';
    const lengthLabel = { short: 'Short', medium: 'Medium', long: 'Long' }[scriptLength] || 'Medium';

    // Auto-save to scripts table
    const { data: saved } = await supabase
      .from('scripts')
      .insert([{
        creator_id:     creatorId,
        creator_handle: creator.handle,
        product_focus:  product,
        script_length:  lengthLabel,
        content:        scriptContent
      }])
      .select()
      .single();

    res.json({ script: scriptContent, scriptId: saved?.id });
  } catch (err) {
    console.error('Script generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate script' });
  }
});

// ── GET /api/generate/scripts ──────────────────────────────────
router.get('/scripts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('scripts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/generate/scripts/:id ──────────────────────────
router.delete('/scripts/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('scripts')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
