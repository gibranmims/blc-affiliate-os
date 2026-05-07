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

// POST /api/generate/brief
// POST /api/generate/script
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
      short: '15–30 seconds. One tight hook, one key benefit, one CTA. No filler.',
      medium: '45–60 seconds. Hook + 2–3 key points + product demo moment + CTA.',
      long: '2–3 minutes. Hook + personal story/problem setup + product walkthrough + results + CTA.'
    };

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2560,
      system: BLC_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Write a ready-to-film video script for this creator:

**Creator Profile:**
- Handle: @${creator.handle}
- Platform: ${creator.platform}
- Niche: ${creator.niche || 'Not specified'}
- Followers: ${creator.followers ? creator.followers.toLocaleString() : 'Unknown'}
- Content Style: ${creator.content_style || 'Not specified'}
- Audience: ${creator.audience_demographics || 'Not specified'}
- Notes: ${creator.notes || 'None'}

**Script Parameters:**
- Product: ${productFocus || 'BLC Bikini Line Shave Serum (their choice of product)'}
- Length: ${lengthGuide[scriptLength] || lengthGuide.medium}

Write a complete, ready-to-film script that sounds like @${creator.handle} wrote it themselves — natural, authentic, no corporate stiffness. Use their content style as your guide.

Format the script like this:

---

## HOOK (0–3 sec)
*[The exact opening line — must stop the scroll immediately]*

[Script line]

[ACTION: what they're doing on camera]

---

## BODY
*[Main content — building interest and introducing the product naturally]*

[Script lines with natural pauses marked as (beat) where appropriate]

[ACTION cues throughout in brackets]

---

## PRODUCT MOMENT
*[The product integration — show, don't just tell]*

[Script lines]

[ACTION: specific demo instructions]

---

## CTA
*[Close — natural, not pushy]*

[Script line with [CREATOR_CODE] placeholder for their unique discount code]

---

## DIRECTOR'S NOTES
**B-roll / Overlay Text suggestions:**
- [3–5 specific visual ideas]

**Key visual moments:**
- [What the camera should focus on]

**Tone reminders:**
- [2–3 notes to keep it authentic to their style]

---

Write the script so it could be filmed TODAY with zero editing needed.`
        }
      ]
    });

    res.json({ script: message.content[0].text });
  } catch (err) {
    console.error('Script generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate script' });
  }
});

module.exports = router;
