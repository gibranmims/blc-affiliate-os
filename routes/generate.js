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
router.post('/brief', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const { creatorId, productFocus, campaignGoal } = req.body;

  if (!creatorId) return res.status(400).json({ error: 'creatorId is required' });

  try {
    const { data: creator, error } = await supabase
      .from('roster')
      .select('*')
      .eq('id', creatorId)
      .single();

    if (error || !creator) return res.status(404).json({ error: 'Creator not found' });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      system: BLC_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Generate a personalized content brief for this creator:

**Creator Profile:**
- Handle: @${creator.handle}
- Platform: ${creator.platform}
- Niche: ${creator.niche || 'Not specified'}
- Followers: ${creator.followers ? creator.followers.toLocaleString() : 'Unknown'}
- Content Style: ${creator.content_style || 'Not specified'}
- Audience: ${creator.audience_demographics || 'Not specified'}
- Notes: ${creator.notes || 'None'}

**Campaign Parameters:**
- Product Focus: ${productFocus || 'General BLC brand awareness — creator choice of product'}
- Campaign Goal: ${campaignGoal || 'Drive awareness and conversions via authentic creator content'}

Write a detailed, personalized content brief using this structure:

## Campaign Overview
(2–3 sentences on what we want and why this creator is right for it)

## Key Messages
(3–4 bullet points tailored to their audience's specific pain points)

## Recommended Format
(Specific content format recommendations for their platform and style)

## Hook Ideas
(3 distinct hook options written in their voice — be specific, not generic)

## Talking Points
(What to say about the product — features, benefits, personal angle)

## Visual Direction
(What the content should look like visually, including shot ideas)

## Caption Framework
(Suggested caption structure with example opening line)

## Hashtag Strategy
(10–15 relevant hashtags for their niche + BLC-branded ones)

## Dos & Don'ts
(Specific guidance based on their audience and content style)

## CTA
(Exact suggested call to action with discount code placeholder)

Make every section feel written specifically for @${creator.handle}, not like a template.`
        }
      ]
    });

    res.json({ brief: message.content[0].text });
  } catch (err) {
    console.error('Brief generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate brief' });
  }
});

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
