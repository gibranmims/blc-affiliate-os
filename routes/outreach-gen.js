const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const Anthropic = require('@anthropic-ai/sdk');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

let gmailTokens = null;
let gmailEmail   = null;

async function persistTokens(tokens, email) {
  const rows = [{ key: 'gmail_tokens', value: tokens }];
  if (email) rows.push({ key: 'gmail_email', value: { email } });

  const { error } = await supabase
    .from('app_settings')
    .upsert(rows, { onConflict: 'key' });

  if (error) console.error('[persistTokens] Supabase error:', error.message, error.code);
  else console.log('[persistTokens] Tokens saved to Supabase');
}

async function loadPersistedTokens() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['gmail_tokens', 'gmail_email']);

  if (error) {
    console.error('[loadPersistedTokens] Supabase error:', error.message, error.code);
    return;
  }
  if (!data || data.length === 0) {
    console.log('[loadPersistedTokens] No saved tokens found');
    return;
  }
  for (const row of data) {
    if (row.key === 'gmail_tokens' && row.value) gmailTokens = row.value;
    if (row.key === 'gmail_email'  && row.value) gmailEmail  = row.value.email || null;
  }
  if (gmailTokens) console.log('[loadPersistedTokens] Tokens restored, email:', gmailEmail);
}

loadPersistedTokens();

const SENDERS = ['Lu'];

function getBaseUrl() {
  return process.env.BASE_URL || 'http://localhost:3000';
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${getBaseUrl()}/api/outreach-gen/auth/callback`
  );
}

function bodyToHtml(text) {
  const blocks = text.split(/\n\n+/).map(b => b.trim()).filter(Boolean);
  const html = blocks.map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    return `<p style="margin: 0 0 16px 0;">${lines.join('<br>')}</p>`;
  }).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #000000;">${html}</td></tr></table>`;
}

function parseFollowers(val) {
  if (!val) return 0;
  const s = String(val).trim().toLowerCase().replace(/,/g, '');
  if (s.endsWith('m')) return Math.round(parseFloat(s) * 1_000_000);
  if (s.endsWith('k')) return Math.round(parseFloat(s) * 1_000);
  return parseInt(s) || 0;
}

function parseGMV(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/[$,\s]/g, '')) || 0;
}

function cleanFirstName(raw) {
  if (!raw) return 'there';
  // Strip emojis and non-printable unicode
  let name = raw.replace(/[\u{1F000}-\u{1FAFF}]|[\u{2600}-\u{27FF}]|[\u{FE00}-\u{FEFF}]|️/gu, '').trim();
  // Get first word (split on spaces, underscores, common separators)
  const firstWord = name.split(/[\s_,;.@]+/)[0];
  if (!firstWord) return 'there';
  // Handle possessives: "Kim's" → "Kim"
  const namePart = firstWord.split("'")[0];
  // Remove any remaining non-letter characters
  const letters = namePart.replace(/[^a-zA-ZÀ-ÿ-]/g, '');
  if (!letters) return 'there';
  // Proper case: first letter uppercase, rest lowercase
  return letters.charAt(0).toUpperCase() + letters.slice(1).toLowerCase();
}

function getBundleSize(followers) {
  if (followers >= 500_000) return 10;
  if (followers >= 75_000) return 5;
  return 3;
}

function normalizeRow(row) {
  const n = {};
  for (const [k, v] of Object.entries(row)) {
    n[k.toLowerCase().trim().replace(/[\s-]+/g, '_')] = (v || '').trim();
  }
  return {
    handle:              n.handle || n.username || n.tiktok_handle || n.ig_handle || '',
    name:                n.name || n.full_name || n.creator_name || '',
    product_category:    n.product_category || n.category || n.niche || '',
    last_30d_gmv:        parseGMV(n.last_30d_gmv || n.gmv || n['30d_gmv'] || n.last_30_days_gmv || '0'),
    follower_count:      parseFollowers(n.follower_count || n.followers || n.follower || '0'),
    avg_engagement:      n.avg_video_engagement_30d || n.avg_engagement || n.engagement || '',
    estimated_post_rate: n.estimated_post_rate || n.post_rate || '',
    profile_url:         n.profile || n.profile_url || n.tiktok_url || '',
    email:               n.email || n.email_address || n.contact_email || ''
  };
}

async function generateEmail(creator, sender) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const firstName = cleanFirstName(creator.name);
  const bundle = getBundleSize(creator.follower_count);

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Write an outreach email from ${sender} at The Bikini Line Co to a creator.

Follow this structure exactly, keeping every paragraph as a single short sentence or two. Put a blank line between each paragraph:

Hey ${firstName},

We love your content and think you'd do really well selling our product as an affiliate.

We're looking for new creators and want to offer you a fixed monthly rate plus commission deal.

What would your rates look like for 3, 5, and 10 video bundles?

Can't wait to hear from you.

Warmly,
${sender}

Rules:
- Output only the email. No subject line. No extra text.
- Do not change the structure above. Do not add lines. Do not remove lines.
- Never use em dashes or en dashes.
- Never describe the brand or product.
- Never use corny or AI-sounding phrases.
- The whole email must be under 6 lines of text (not counting blank lines and sign-off).
- Keep it simple, direct, and human.`
    }]
  });

  return msg.content[0].text.trim();
}

// POST /api/outreach-gen/generate
router.post('/generate', upload.single('csv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  let records;
  try {
    records = parse(req.file.buffer.toString('utf-8'), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
  } catch (e) {
    return res.status(400).json({ error: `CSV parse error: ${e.message}` });
  }

  if (records.length === 0) return res.status(400).json({ error: 'CSV has no rows' });
  if (records.length > 150) return res.status(400).json({ error: 'Max 150 creators per batch' });

  const creators = records.map(normalizeRow).filter(c => c.name || c.handle);

  const emails = [];
  const BATCH = 5;

  for (let i = 0; i < creators.length; i += BATCH) {
    const batch = creators.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map((creator, idx) => {
        const sender = SENDERS[(i + idx) % SENDERS.length];
        return generateEmail(creator, sender)
          .then(body => ({
            handle:              creator.handle,
            name:                creator.name,
            email:               creator.email,
            follower_count:      creator.follower_count,
            last_30d_gmv:        creator.last_30d_gmv,
            product_category:    creator.product_category,
            avg_engagement:      creator.avg_engagement,
            estimated_post_rate: creator.estimated_post_rate,
            profile_url:         creator.profile_url,
            subject:             'paid opportunity with The Bikini Line Co',
            body,
            sender,
            error: null
          }))
          .catch(err => ({
            handle:              creator.handle,
            name:                creator.name,
            email:               creator.email,
            follower_count:      creator.follower_count,
            last_30d_gmv:        creator.last_30d_gmv,
            product_category:    creator.product_category,
            avg_engagement:      creator.avg_engagement,
            estimated_post_rate: creator.estimated_post_rate,
            profile_url:         creator.profile_url,
            subject:             'paid opportunity with The Bikini Line Co',
            body:                null,
            sender:              SENDERS[(i + idx) % SENDERS.length],
            error:               err.message
          }));
      })
    );
    emails.push(...results);
  }

  res.json({ emails, total: emails.length });
});

// POST /api/outreach-gen/counter-offer
router.post('/counter-offer', async (req, res) => {
  const { name, handle, askedRate3, askedRate5, askedRate10, askedRateCustom, askedRateCustomCount,
          counterVideos, counterTotal, counterPerVid, tier, sender } = req.body;
  if (!name || !counterVideos || !counterTotal) return res.status(400).json({ error: 'name, counterVideos, and counterTotal required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const firstName  = cleanFirstName(name);
  const senderName = sender || 'Tamar';
  const perVid     = counterPerVid || (counterTotal / counterVideos);

  const pvd = (total, n) => `$${Number(total).toLocaleString('en-US')} total ($${Math.round(total/n).toLocaleString('en-US')}/vid avg)`;
  const ratesLine = [
    askedRate3  ? `3 videos: ${pvd(askedRate3, 3)}`   : null,
    askedRate5  ? `5 videos: ${pvd(askedRate5, 5)}`   : null,
    askedRate10 ? `10 videos: ${pvd(askedRate10, 10)}` : null,
    askedRateCustom && askedRateCustomCount ? `${askedRateCustomCount} videos: ${pvd(askedRateCustom, askedRateCustomCount)}` : null
  ].filter(Boolean).join('; ') || '(rates not specified)';

  const ourOffer = `${counterVideos} videos for $${Number(counterTotal).toLocaleString('en-US')} total ($${Math.round(perVid).toLocaleString('en-US')}/vid avg)`;

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: `You are writing a counter offer message for The Bikini Line Co (BLC).

CONTEXT:
Creator: ${firstName} (@${handle || ''})
Their asked rates: ${ratesLine}
Our counter offer: ${ourOffer}

WRITING RULES — follow every single one:

1. First line is exactly: Hey ${firstName},
2. Last line is exactly: ${senderName}
3. NEVER use em dashes or en dashes. Ever.
4. Total length: 60 to 90 words. Short and skimmable.
5. One blank line between every sentence or two. Easy to scan.
6. Do NOT open with "Thanks for getting back to me" or similar filler. Acknowledge briefly or skip it.

TONE AND FRAMING:
- Sound like a real person, not a brand or an AI. Write how Tamar or Lu would actually text a creator.
- Never say "I'd like" — use "I was thinking we could", "What if we started with", "Would you be open to"
- Frame the counter as a specific proposal: ${counterVideos} videos for $${Number(counterTotal).toLocaleString('en-US')} total
- Present the total amount, not the per-video rate — say "5 videos for $1,500" not "$300 per video"
- Frame it as starting with a test batch, not as their rate being too high
- Never say: "lower entry point", "since this is new for you", "your rate is high", "before we commit more"
- Do say things like: "start with a batch to test what hits", "scale from there if it performs", "help guide angles we've seen convert"
- Sell upside without overpromising. No guarantees.
- End with a clear easy-to-answer question: "Would you be open to that?" or "Does that work for you?"

STRUCTURE (in this order):
1. Brief warm acknowledgment (1 line max, or skip it)
2. Counter: propose ${counterVideos} videos for $${Number(counterTotal).toLocaleString('en-US')} total, frame as a test batch to start
3. The upside: we'll help with angles that convert, more commission potential
4. Close with one clear question

Output ONLY the message. No subject line. No preamble. Start with Hey ${firstName},`
      }]
    });

    res.json({ email: msg.content[0].text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach-gen/create-contract
router.post('/create-contract', async (req, res) => {
  if (!gmailTokens) return res.status(401).json({ error: 'Google not connected. Connect Google first.' });

  const { creatorName, handle, creatorEmail, signedRate, videoCount, startDate } = req.body;
  if (!creatorName || !handle || !signedRate || !videoCount || !startDate) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const totalPayment = Math.round(parseFloat(signedRate) * parseInt(videoCount));
  const halfPayment  = Math.round(totalPayment / 2);

  const start = new Date(startDate + 'T12:00:00'); // noon to avoid timezone shifts
  const end   = new Date(start);
  end.setDate(end.getDate() + 60);

  const fmt = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const TEMPLATE_ID = '10NFrH809w1ksmG8TlSp6_fwanNnm2nFcJNd1HzauSEY';
  const FOLDER_ID   = '1EX2fAsKvNad8tWEXchBYTURM9kP4fiL3';

  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(gmailTokens);

    if (gmailTokens.expiry_date && gmailTokens.expiry_date < Date.now() + 60_000) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      gmailTokens = credentials;
      oauth2Client.setCredentials(gmailTokens);
      persistTokens(gmailTokens, gmailEmail);
    }

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const docs  = google.docs({ version: 'v1', auth: oauth2Client });

    // 1. Create creator folder inside TikTok Affiliates folder
    const folderRes = await drive.files.create({
      requestBody: {
        name: `${creatorName} (@${handle})`,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [FOLDER_ID]
      },
      fields: 'id'
    });
    const folderId = folderRes.data.id;

    // 2. Copy template into the new folder
    const copyRes = await drive.files.copy({
      fileId: TEMPLATE_ID,
      requestBody: {
        name: `${creatorName} - BLC Partnership Agreement`,
        parents: [folderId]
      },
      fields: 'id'
    });
    const docId = copyRes.data.id;

    // 3. Replace all placeholders
    const replacements = {
      '[BLC CONTACT NAME]':  'Gibran Mims',
      '[BLC CONTACT TITLE]': 'Co-Founder',
      '[BLC CONTACT EMAIL]': 'hello@thebikiniline.co',
      '[CREATOR NAME]':      creatorName,
      '[@TIKTOK HANDLE]':   `@${handle}`,
      '[CREATOR EMAIL]':     creatorEmail || '',
      '[NUMBER OF VIDEOS]':  String(videoCount),
      '[START DATE]':        fmt(start),
      '[END DATE]':          fmt(end),
      '[TOTAL PAYMENT]':     totalPayment.toLocaleString(),
      '[50% OF TOTAL]':      halfPayment.toLocaleString(),
      '[BLC INVOICE EMAIL]': 'partnerships@thebikiniline.co'
    };

    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: Object.entries(replacements).map(([find, replace]) => ({
          replaceAllText: {
            containsText: { text: find, matchCase: true },
            replaceText: replace
          }
        }))
      }
    });

    // 4. Export as PDF
    const pdfRes = await drive.files.export(
      { fileId: docId, mimeType: 'application/pdf' },
      { responseType: 'arraybuffer' }
    );

    const safeName = creatorName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName} - BLC Contract.pdf"`);
    res.send(Buffer.from(pdfRes.data));

  } catch (err) {
    console.error('Contract generation error:', err);
    if (err.message?.includes('insufficientPermissions') || err.code === 403) {
      return res.status(403).json({ error: 'Insufficient Google permissions. Please disconnect and reconnect Google to grant Drive access.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// GET /api/outreach-gen/auth/url
router.get('/auth/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not configured' });
  }
  const oauth2Client = getOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.compose',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents'
    ],
    prompt: 'consent'
  });
  res.json({ url });
});

// GET /api/outreach-gen/auth/callback
router.get('/auth/callback', async (req, res) => {
  const { code, error } = req.query;
  const style = `font-family:system-ui,sans-serif;background:#0c0c10;color:#FFF6EB;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:12px;text-align:center;padding:24px`;

  if (error || !code) {
    return res.send(`<html><body style="${style}"><h2 style="color:#f87171">Auth failed</h2><p style="color:#9090aa">You can close this tab.</p></body></html>`);
  }

  try {
    const oauth2Client = getOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    gmailTokens = tokens;
    try {
      oauth2Client.setCredentials(tokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      gmailEmail = profile.data.emailAddress;
    } catch (_) {}
    await persistTokens(gmailTokens, gmailEmail);
    res.send(`<html><body style="${style}"><h2>Gmail connected.</h2><p style="color:#9090aa">You can close this tab and go back to BLC Affiliate OS.</p><script>window.close();</script></body></html>`);
  } catch (err) {
    res.send(`<html><body style="${style}"><h2 style="color:#f87171">Error: ${err.message}</h2><p style="color:#9090aa">You can close this tab.</p></body></html>`);
  }
});

// GET /api/outreach-gen/auth/status
router.get('/auth/status', async (req, res) => {
  if (gmailTokens && !gmailEmail) {
    try {
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials(gmailTokens);
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      gmailEmail = profile.data.emailAddress;
      await persistTokens(gmailTokens, gmailEmail);
    } catch (_) {}
  }
  res.json({ connected: !!gmailTokens, email: gmailEmail });
});

// DELETE /api/outreach-gen/auth/disconnect
router.delete('/auth/disconnect', async (req, res) => {
  gmailTokens = null;
  gmailEmail   = null;
  try {
    await supabase.from('app_settings').delete().in('key', ['gmail_tokens', 'gmail_email']);
  } catch (_) {}
  res.json({ disconnected: true });
});

// POST /api/outreach-gen/save-drafts
router.post('/save-drafts', async (req, res) => {
  if (!gmailTokens) return res.status(401).json({ error: 'Gmail not connected. Click Connect Gmail first.' });

  const { emails } = req.body;
  if (!emails?.length) return res.status(400).json({ error: 'No emails provided' });

  const toSave = emails.filter(e => e.email && e.body && !e.error);
  if (toSave.length === 0) return res.status(400).json({ error: 'No valid emails to save (missing recipient email or body)' });

  try {
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials(gmailTokens);

    if (gmailTokens.expiry_date && gmailTokens.expiry_date < Date.now() + 60_000) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      gmailTokens = credentials;
      oauth2Client.setCredentials(gmailTokens);
      persistTokens(gmailTokens, gmailEmail);
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const results = await Promise.all(
      toSave.map(async (e) => {
        const htmlBody = bodyToHtml(e.body);
        const mime = [
          `To: ${e.email}`,
          `Subject: ${e.subject || 'paid opportunity with The Bikini Line Co'}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/html; charset=utf-8`,
          ``,
          htmlBody
        ].join('\r\n');

        const encoded = Buffer.from(mime)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        await gmail.users.drafts.create({
          userId: 'me',
          requestBody: { message: { raw: encoded } }
        });

        return { handle: e.handle, saved: true };
      })
    );

    res.json({ saved: results.length, skipped: emails.length - toSave.length, results });
  } catch (err) {
    console.error('Save drafts error:', err);
    if (err.message?.includes('invalid_grant') || err.message?.includes('Token has been expired')) {
      gmailTokens = null;
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
