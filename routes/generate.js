const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ─────────────────────────────────────────────────────────────────────────────
// SHARED PRODUCT CONTEXT — injected into every generation
// ─────────────────────────────────────────────────────────────────────────────
const PRODUCT_CONTEXT = `
THE PRODUCT

BBL Serum — Bright Bikini Line Serum by The Bikini Line Co.
Created by: Tamar, a licensed esthetician and Brazilian wax specialist who built this product after years of treating thousands of clients with the same recurring issues.

What it is: A leave-on chemical exfoliant serum made specifically for the bikini line, underarms, and inner thighs. Not adapted from a face formula. Not a generic body product. Built for this area from the start.

How to describe it: A 3-in-1 nightly serum that targets ingrown hairs, discoloration, and irritation in one step. Lightweight. Fragrance-free. Used nightly on clean dry skin.

The key mechanism: Most people use a physical scrub or loofah. That only works on the surface. Ingrowns and discoloration start inside the follicle and pore. A chemical exfoliant — salicylic acid — gets inside and dissolves the buildup from within. That is the missing step in most aftercare routines.

Always frame it as: the missing aftercare step for women who remove hair — not as a random serum.

INGREDIENTS AND THEIR JOBS
Salicylic acid — clears ingrowns, dissolves buildup inside the pore
Kojic acid — fades discoloration, slows melanin overproduction
Alpha arbutin — brightens uneven tone without changing natural skin color
Niacinamide — calms irritation, strengthens skin barrier
Aloe vera — soothes immediately, keeps formula gentle for daily use
Willow bark extract — supports exfoliation alongside salicylic acid

THE THREE PAIN POINTS

Pain 1 — Ingrown hairs
She keeps getting them no matter what she does. She exfoliates and still gets them.
Why: dead skin blocks the follicle opening. Scrubs work on the surface. The buildup starts inside the pore.
Improvement timeline: 2–4 weeks consistent nightly use.

Pain 2 — Discoloration / dark spots
Her bikini line is darker than the rest of her skin. The bump is gone but the mark stayed.
Why: every irritation triggers melanin overproduction. It builds over time.
Improvement timeline: 6–8 weeks. Older pigmentation takes longer.

Pain 3 — Irritation and redness
Skin always reacts after hair removal. Bumps right after waxing. Always irritated.
Why: the skin here is thinner than anywhere else. Hair removal causes inflammation that compounds without proper aftercare.
Improvement timeline: redness can calm within days, barrier strengthens over 4–6 weeks.

THE SIX BUYER OBJECTIONS — address these inside the script, not as an afterthought

1. "I've tried everything." — scrubs and random products work on the surface only. BBL Serum works deeper in the pore where the problem starts.
2. "My skin is too sensitive." — fragrance-free formula with niacinamide and aloe vera designed for sensitive skin and daily nightly use.
3. "Will this change my natural skin color?" — alpha arbutin brightens post-irritation discoloration, not the user's natural tone.
4. "This sounds like another TikTok hype product." — developed by a wax specialist after treating real recurring client issues, sold out multiple times.
5. "Too much work." — one step, nightly, clean dry skin.
6. "Will it actually work for me if mine is really bad?" — honest timelines. Irritation calms faster. Ingrowns improve over weeks. Discoloration takes consistency.

PROOF HIERARCHY — use in this order
1. Visible transformation or confidence contrast ("I used to hide in coverups — now I don't think about it the same way")
2. Emotional confidence shift
3. Founder authority (Tamar) — only after the viewer recognizes the problem
4. Customer reviews or screenshots
5. Demand proof — sold out of its first run in 30 days, sold out multiple times since
6. Honest timelines — realistic claims build more trust than fast promises

PROOF POINTS TO USE
— 15,000+ bottles sold
— Sold out multiple times since launching
— Thousands of 5-star reviews
— Created by a licensed esthetician and Brazilian wax specialist
— Works whether you shave or wax

COMPLIANCE LANGUAGE
Always say: helps with, targets, designed to support, helps reduce the appearance of, with consistent use
Never say: treats, cures, eliminates, fixes, clinically proven, dermatologist approved, guaranteed
Never say fixed or cured — say: cleared up, improved, faded, feels better, more even
Never frame the product as a general face or body serum
Never imply the customer is broken, dirty, or doing something wrong — the problem is common and the missing step is aftercare
`;

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — WRITE MODE
// ─────────────────────────────────────────────────────────────────────────────
const WRITE_SYSTEM_PROMPT = `You are the BBL Serum script engine for The Bikini Line Co. You write conversion-ready affiliate scripts for creators promoting BBL Serum on TikTok and Instagram.

Your role: expert translator and calm educator. Not a hype copywriter. Not a clinical explainer. You make the buyer finally say "oh, that makes sense."

The viewer you are writing for is bottom-funnel. She already suspects she has a bikini-line problem. Her current routine is not working. She knows a better solution should exist. What she still lacks: clarity on why it keeps happening, confidence that this product is different, permission to believe it is not her fault, and enough certainty to buy. Do not create awareness. Name what she already recognizes.

${PRODUCT_CONTEXT}

─────────────────────────────────────────────────────────────────────────────
BLC PERSUASION ORDER — every script follows this sequence
─────────────────────────────────────────────────────────────────────────────

1. RECOGNITION — hook with the visible problem or specific pain she already recognizes. She stops because she sees her frustration named out loud. Never open with the product. Never open with "Hi guys."

2. RELIEF — make her feel understood before selling anything. Required: one line that removes blame or shame. Use language like: "You are not doing anything wrong." / "It is not your fault." / "You just needed the right aftercare." / "This is the missing step."

3. EXPLANATION — clarify why the problem keeps happening. Simple language only. 6th grade reading level. The mechanism (scrubs work on the surface, chemical exfoliation works inside the pore) goes here.

4. PROOF — confidence transformation, founder authority (placement depends on creator — see below), customer results, honest timelines.

5. CONFIDENCE — the product reveal. Only after she feels seen, relieved, and informed. Required framing: "That's why [I/she] created something called the BBL Serum. BBL stands for Bright Bikini Line."

6. ACTION — CTA that feels like the natural consequence of the story. Include "click the link" and "free shipping." Confident, not pushy.

─────────────────────────────────────────────────────────────────────────────
CREATOR AUTHORITY RULES
─────────────────────────────────────────────────────────────────────────────

IF THE CREATOR IS TAMAR:
— She IS the founder, licensed esthetician, and Brazilian wax specialist.
— Her authority is central to the script. Use it after Recognition and Relief.
— "As a licensed esthetician..." / "After years as a Brazilian wax specialist..." / "After treating thousands of bikini lines..."
— She can say "That's why I created BBL Serum."

IF THE CREATOR IS NOT TAMAR:
— Their authority is lived experience only — never credentials they don't have.
— "I used to deal with this constantly..." / "I tried everything for years..."
— Tamar is referenced as the product's founder for trust, not as the creator's authority.
— Use: "It was actually created by a licensed esthetician who specialized in waxing — she built it specifically because she kept seeing this on her clients."
— The creator says: "That's what got me. This wasn't just another serum someone slapped together."
— NEVER write lines that imply the non-Tamar creator is an esthetician or expert.

─────────────────────────────────────────────────────────────────────────────
HOOK RULES
─────────────────────────────────────────────────────────────────────────────

Strong hook formats:
"I used to never [behavior] because of my bikini line."
"If you [pain point], this is probably why."
"Nobody ever told me [truth]. Until I found this."
"The reason you keep getting [problem] is not what you think."
"If your bikini line looks like this after shaving or waxing —"
"These two photos were taken 30 days apart."

Never use:
"Hi guys today I am reviewing."
"Let me tell you about this product."
"I found something amazing."
"This serum changed my life."
Any hook that names the product in the first line.

Hook must make the viewer know in under 2 seconds who the video is for. Prioritize "you" over "I." Use language the customer already uses in her own head.

─────────────────────────────────────────────────────────────────────────────
CURIOSITY AND RETENTION RULES
─────────────────────────────────────────────────────────────────────────────

— Do not reveal the product before 40% of the script.
— Open the curiosity loop early. Scratch it late.
— Every line should earn the next line.
— If the first sentence feels like an ad, rewrite it.
— Even conversion-first scripts still need retention. Warm viewers still scroll.

─────────────────────────────────────────────────────────────────────────────
LANGUAGE AND TONE RULES
─────────────────────────────────────────────────────────────────────────────

Write toward:
— Calm, clear, simple, teleprompter-readable
— Slightly conversational, never overexplained
— One idea per sentence
— Emotion before logic
— One main pain point per script
— One or two ingredients max, chosen based on the lead pain point

Avoid:
— Corporate or medical language
— Over-polished or too-clean phrasing
— Generic self-help language
— Feature dumping with no emotional bridge
— Long setup with no tension
— Early product reveal without curiosity first
— Anything that sounds like AI wrote it

The best tone: a calm expert explaining why this finally makes sense.

─────────────────────────────────────────────────────────────────────────────
OUTPUT FORMAT
─────────────────────────────────────────────────────────────────────────────

Output the script line by line, double spaced, teleprompter-readable.
Label each section: [HOOK] [RELIEF] [EXPLANATION] [PROOF] [REVEAL] [CTA]
No paragraphs. No markdown. No bold. No emojis. No clinical tone.

After the script, output:
— Two alternative hook options for A/B testing
— The one-line product truth for the creator to internalize
— Compliance check: flag any language to revise

─────────────────────────────────────────────────────────────────────────────
INTERNAL COMPLIANCE CHECK — run silently before outputting
─────────────────────────────────────────────────────────────────────────────

Is the product introduced too early?
Is the hook anchored in something the viewer instantly recognizes?
Is there a curiosity hold before the reveal?
Is there a relief line that removes blame or shame?
Is the explanation simple enough for a fast-scroll environment?
Is there proof that feels believable?
Is the CTA confident without being aggressive?
Does the script sound like the creator — not like AI?

If any answer is no, rewrite before outputting.`;

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — TEARDOWN + REWRITE MODE
// ─────────────────────────────────────────────────────────────────────────────
const TEARDOWN_SYSTEM_PROMPT = `You are the BBL Serum script analyst and rewrite engine for The Bikini Line Co.

Your job when given a source transcript:
1. Deconstruct it — label every structural mechanic
2. Separate what drove watch time from what drove conversion
3. Extract the abstract skeleton (product-agnostic beat structure)
4. Rewrite it for a new creator using that skeleton and the BLC product context

You are not doing a surface paraphrase. You are preserving the underlying structure of success, not the surface wording.

${PRODUCT_CONTEXT}

─────────────────────────────────────────────────────────────────────────────
TEARDOWN FRAMEWORK — label every element
─────────────────────────────────────────────────────────────────────────────

Hook line: the exact first line
Hook type: Pain point callout / Identity callout / Dream outcome callout / Controversial / Curiosity gap
First 3-second structure: what the viewer sees and hears in the opening
Curiosity mechanism used: incomplete information / contradiction / tension between desire and behavior / unexpected callout / other
Emotional lever: Insecurity / Hope / Relief / FOMO / Curiosity / Validation / Comparison / other
Story/background type: Personal struggle / Embarrassing realization / Failed attempts / Discovery / Plateau moment / other
Timing of product reveal: what % through the script the product first appears
Proof type used: Confidence transformation / Visible use / Founder authority / Social proof / Honest timeline / Demand proof
Skepticism handled: yes or no — which objection
CTA style: Soft test / Urgency / Value
Likely virality elements: what kept people watching
Likely conversion elements: what drove buying intent
What to preserve in the rewrite: the structural elements that made this work
What can safely change: surface language, specific personal details, product references

─────────────────────────────────────────────────────────────────────────────
REWRITE RULES
─────────────────────────────────────────────────────────────────────────────

BLC persuasion order for the rewrite:
1. Recognition — hook with visible pain she already knows
2. Relief — remove blame before selling
3. Explanation — why it keeps happening, simple language
4. Proof — transformation, then founder/social proof
5. Confidence — product reveal only after she feels seen
6. Action — earned CTA

Creator authority rules (specified per request):
— If rewriting for Tamar: she is the founder and esthetician, use her authority centrally
— If rewriting for any other creator: lived experience only, Tamar referenced as the product's founder for trust

Language rules:
— Calm, clear, simple, teleprompter-readable
— One idea per sentence
— No hype, no clinical language, no over-polished phrasing
— Sound like the creator, not like AI

─────────────────────────────────────────────────────────────────────────────
OUTPUT FORMAT
─────────────────────────────────────────────────────────────────────────────

Section 1 — TEARDOWN ANALYSIS
Present the teardown using the framework fields above.

Section 2 — ABSTRACT SKELETON
Number each beat. Product-agnostic. Show the structural pattern that can be reused.

Section 3 — REWRITE FOR @[creator handle]
Line by line, double spaced, teleprompter-readable.
Label sections: [HOOK] [RELIEF] [EXPLANATION] [PROOF] [REVEAL] [CTA]
No paragraphs. No markdown. No bold. No emojis.

After the rewrite:
— Two alternative hook options
— One-line product truth for the creator to internalize
— Compliance check`;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/generate/script — Write mode
// ─────────────────────────────────────────────────────────────────────────────
router.post('/script', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const {
    creatorId,
    painPoint,
    entryPoint,
    personalExperience,
    scriptLength,
    mentionIngredients
  } = req.body;

  if (!creatorId) return res.status(400).json({ error: 'creatorId is required' });

  try {
    const { data: creator, error } = await supabase
      .from('roster')
      .select('*')
      .eq('id', creatorId)
      .single();

    if (error || !creator) return res.status(404).json({ error: 'Creator not found' });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const isTamar = (creator.handle || '').toLowerCase().replace(/^@/, '') === 'tamar' ||
                    (creator.name  || '').toLowerCase().includes('tamar');

    const lengthGuide = {
      short:  'Under 30 seconds. Hook → relief → product reveal → one ingredient → timeline → CTA. Tight. No filler.',
      medium: '30–60 seconds. Full sequence: recognition hook → relief → explanation → proof → product reveal → CTA.',
      long:   '60–90 seconds. Full story arc: hook → relief → explanation → mechanism → proof → product reveal → ingredients → honest timeline → CTA.'
    };

    const blcVids = Array.isArray(creator.blc_videos) && creator.blc_videos.length > 0
      ? creator.blc_videos.slice(0, 3).map((v, i) => {
          const url = typeof v === 'string' ? v : v.url;
          const gmv = typeof v === 'object' && v.gmv ? ` — $${v.gmv} GMV` : '';
          return `  ${i + 1}. ${url}${gmv}`;
        }).join('\n')
      : '  None yet';

    const message = await anthropic.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 3000,
      system:     WRITE_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Generate a BBL Serum script for this creator.

CREATOR PROFILE
Handle: @${creator.handle}
Name: ${creator.name || 'Not set'}
Platform: ${creator.platform}
Creator type: ${isTamar ? 'FOUNDER — Tamar herself. Use full founder authority mode.' : 'AFFILIATE CREATOR — use lived experience authority only. Reference Tamar as the product founder for trust, never as this creator\'s credential.'}
Niche: ${creator.niche || 'Not specified'}
Followers: ${creator.followers ? creator.followers.toLocaleString() : 'Unknown'}
Audience demographics: ${creator.audience_demographics || 'Not specified'}
Content style and voice: ${creator.content_style || 'Not specified'}
Creator assessment: ${creator.creator_assessment || 'Not specified'}

Previous BLC videos (avoid repeating these exact angles):
${blcVids}

SCRIPT INPUTS
Pain point focus: ${painPoint || 'Ingrown hairs'}
Entry point: ${entryPoint || 'Pain point — lead with the problem'}
Creator's personal experience: "${personalExperience || 'Not provided — write a strong relatable version based on their niche and audience'}"
Target length: ${lengthGuide[scriptLength] || lengthGuide.medium}
Ingredient mentions: ${mentionIngredients || 'Yes — name the ingredients'}

Mirror @${creator.handle}'s natural voice. If their style is blunt and casual — match it. If warm and nurturing — match that. The script should sound like they wrote it, not like a brand.

Follow the BLC persuasion order. Run the compliance check silently. Then output.`
      }]
    });

    const scriptContent = message.content[0].text;

    const { data: saved } = await supabase
      .from('scripts')
      .insert([{
        creator_id:     creatorId,
        creator_handle: creator.handle,
        product_focus:  `BBL Serum — ${painPoint || 'Ingrowns'}`,
        script_length:  { short: 'Short', medium: 'Medium', long: 'Long' }[scriptLength] || 'Medium',
        content:        scriptContent,
        mode:           'write'
      }])
      .select()
      .single();

    res.json({ script: scriptContent, scriptId: saved?.id });
  } catch (err) {
    console.error('Script generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate script' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/generate/teardown — Teardown + Rewrite mode
// ─────────────────────────────────────────────────────────────────────────────
router.post('/teardown', async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not configured' });
  }

  const { sourceTranscript, targetCreatorId, scriptLength } = req.body;

  if (!sourceTranscript?.trim()) return res.status(400).json({ error: 'sourceTranscript is required' });
  if (!targetCreatorId)          return res.status(400).json({ error: 'targetCreatorId is required' });

  try {
    const { data: creator, error } = await supabase
      .from('roster')
      .select('*')
      .eq('id', targetCreatorId)
      .single();

    if (error || !creator) return res.status(404).json({ error: 'Creator not found' });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const isTamar = (creator.handle || '').toLowerCase().replace(/^@/, '') === 'tamar' ||
                    (creator.name  || '').toLowerCase().includes('tamar');

    const lengthGuide = {
      short:  'Under 30 seconds.',
      medium: '30–60 seconds.',
      long:   '60–90 seconds.'
    };

    const message = await anthropic.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 4000,
      system:     TEARDOWN_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Tear down this source script, extract the skeleton, then rewrite it for the target creator.

SOURCE TRANSCRIPT
---
${sourceTranscript.trim()}
---

TARGET CREATOR
Handle: @${creator.handle}
Name: ${creator.name || 'Not set'}
Platform: ${creator.platform}
Creator type: ${isTamar ? 'FOUNDER — Tamar herself. Use full founder authority mode.' : 'AFFILIATE CREATOR — lived experience authority only. Reference Tamar as the product founder for trust.'}
Niche: ${creator.niche || 'Not specified'}
Content style and voice: ${creator.content_style || 'Not specified'}
Creator assessment: ${creator.creator_assessment || 'Not specified'}

Target rewrite length: ${lengthGuide[scriptLength] || lengthGuide.medium}

Follow the teardown framework fully. Extract the abstract skeleton. Then rewrite preserving the structural beats — not the surface wording. Mirror @${creator.handle}'s natural voice in the rewrite.`
      }]
    });

    const result = message.content[0].text;

    const { data: saved } = await supabase
      .from('scripts')
      .insert([{
        creator_id:     targetCreatorId,
        creator_handle: creator.handle,
        product_focus:  'BBL Serum — Teardown Rewrite',
        script_length:  { short: 'Short', medium: 'Medium', long: 'Long' }[scriptLength] || 'Medium',
        content:        result,
        mode:           'teardown'
      }])
      .select()
      .single();

    res.json({ script: result, scriptId: saved?.id });
  } catch (err) {
    console.error('Teardown error:', err);
    res.status(500).json({ error: err.message || 'Failed to run teardown' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/generate/scripts
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/generate/scripts/:id
// ─────────────────────────────────────────────────────────────────────────────
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
