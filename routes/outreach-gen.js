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
let driveTokens  = null;
let driveEmail   = null;

async function persistSettings(updates) {
  const rows = Object.entries(updates).map(([key, value]) => ({ key, value }));
  const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
  if (error) console.error('[persistSettings] Supabase error:', error.message);
  else console.log('[persistSettings] Saved keys:', Object.keys(updates).join(', '));
}

async function loadPersistedTokens() {
  const { data, error } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['gmail_tokens', 'gmail_email', 'drive_tokens', 'drive_email']);

  if (error) { console.error('[loadPersistedTokens] Supabase error:', error.message); return; }
  if (!data || data.length === 0) { console.log('[loadPersistedTokens] No saved tokens'); return; }
  for (const row of data) {
    if (row.key === 'gmail_tokens' && row.value) gmailTokens = row.value;
    if (row.key === 'gmail_email'  && row.value) gmailEmail  = row.value.email || null;
    if (row.key === 'drive_tokens' && row.value) driveTokens = row.value;
    if (row.key === 'drive_email'  && row.value) driveEmail  = row.value.email || null;
  }
  if (gmailTokens) console.log('[loadPersistedTokens] Gmail restored:', gmailEmail);
  if (driveTokens) console.log('[loadPersistedTokens] Drive restored:', driveEmail);
}

// keep old name for backwards compat
async function persistTokens(tokens, email) {
  await persistSettings({ gmail_tokens: tokens, ...(email ? { gmail_email: { email } } : {}) });
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

function getDriveOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${getBaseUrl()}/api/outreach-gen/drive-auth/callback`
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
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Write a counter offer message following this structure and tone EXACTLY.

Example output (use this as your template):

Hey Jayden,

Appreciate you sending this over.

I was thinking we could start with a batch to test what actually hits and then scale from there.

Would you be open to doing 10 videos for $1,000 to start?

We'll also help guide on angles we've seen convert well so you can maximize what you make on commission.

Let me know your thoughts.

Best,
Lu

---

Now write the same message for this deal:

Creator first name: ${firstName}
Their asked rates: ${ratesLine}
Our counter offer: ${counterVideos} videos for $${Number(counterTotal).toLocaleString('en-US')} total

Rules:
- Replace "Jayden" with "${firstName}" and "Lu" with "${senderName}"
- Replace the video count and dollar amount with the actual numbers above
- You may vary the exact wording slightly so it doesn't sound copy-pasted, but keep every paragraph as short as in the example
- NEVER use em dashes or en dashes
- Do NOT say "I'd like" — say "I was thinking we could" or "Would you be open to"
- Do NOT mention their rate or negotiate against them. Frame it as a test batch.
- Output only the message. No subject line. No extra commentary.`
      }]
    });

    res.json({ email: msg.content[0].text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/outreach-gen/create-contract
router.post('/create-contract', async (req, res) => {
  const activeTokens = driveTokens || gmailTokens;
  if (!activeTokens) return res.status(401).json({ error: 'Connect a Google Drive account first (use the Drive Connect button in New Batch).' });

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
    oauth2Client.setCredentials(activeTokens);

    if (activeTokens.expiry_date && activeTokens.expiry_date < Date.now() + 60_000) {
      const { credentials } = await oauth2Client.refreshAccessToken();
      if (driveTokens) {
        driveTokens = credentials;
        persistSettings({ drive_tokens: driveTokens });
      } else {
        gmailTokens = credentials;
        persistTokens(gmailTokens, gmailEmail);
      }
      oauth2Client.setCredentials(credentials);
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
      return res.status(403).json({ error: 'Google Drive permissions error. Make sure you connected the correct Google account (hello@thebikiniline.co) using the "Connect Google Drive" button in New Batch.' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/outreach-gen/sign-flow
// Full onboarding: contract PDF → Gmail draft + attachment → roster entry
// ============================================================
router.post('/sign-flow', async (req, res) => {
  const { outreachId } = req.body;
  if (!outreachId) return res.status(400).json({ error: 'outreachId required' });

  const activeDrive = driveTokens || gmailTokens;
  const activeGmail = gmailTokens;
  if (!activeDrive) return res.status(401).json({ error: 'Google Drive not connected. Connect from New Batch first.' });
  if (!activeGmail) return res.status(401).json({ error: 'Gmail not connected. Connect from New Batch first.' });

  try {
    // 1. Load outreach record
    const { data: r, error: rErr } = await supabase
      .from('outreach').select('*').eq('id', outreachId).single();
    if (rErr || !r) return res.status(404).json({ error: 'Outreach record not found' });

    const rate        = parseFloat(r.counter_offer_amount);
    const videoCount  = parseInt(r.video_count);
    const startDate   = r.start_date;
    const creatorName = r.name || r.handle;
    const handle      = r.handle;
    const email       = r.email || '';

    if (!rate || isNaN(rate))            return res.status(400).json({ error: 'Rate per video is required — fill it in before completing onboarding.' });
    if (!videoCount || isNaN(videoCount)) return res.status(400).json({ error: 'Video count is required.' });
    if (!startDate)                       return res.status(400).json({ error: 'Start date is required.' });

    const totalDeal   = Math.round(rate * videoCount);
    const halfDeposit = Math.round(totalDeal / 2);

    // 2. Load Discord invite link
    const { data: discordRow } = await supabase
      .from('app_settings').select('value').eq('key', 'discord_invite_link').single();
    const discordLink = discordRow?.value || '[Add Discord link in Settings ⚙]';

    // 3. Generate contract PDF via Google Drive (clone template → fill → export PDF)
    const start = new Date(startDate + 'T12:00:00');
    const end   = new Date(start);
    end.setDate(end.getDate() + 60);
    const fmtDate = d => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    const TEMPLATE_ID = '10NFrH809w1ksmG8TlSp6_fwanNnm2nFcJNd1HzauSEY';
    const FOLDER_ID   = '1EX2fAsKvNad8tWEXchBYTURM9kP4fiL3';

    const driveAuth = getOAuthClient();
    driveAuth.setCredentials(activeDrive);
    if (activeDrive.expiry_date && activeDrive.expiry_date < Date.now() + 60_000) {
      const { credentials } = await driveAuth.refreshAccessToken();
      if (driveTokens) { driveTokens = credentials; await persistSettings({ drive_tokens: driveTokens }); }
      else             { gmailTokens = credentials; await persistTokens(gmailTokens, gmailEmail); }
      driveAuth.setCredentials(credentials);
    }

    const drive = google.drive({ version: 'v3', auth: driveAuth });
    const docs  = google.docs({ version: 'v1', auth: driveAuth });

    // Create creator folder
    const folderRes = await drive.files.create({
      requestBody: { name: `${creatorName} (@${handle})`, mimeType: 'application/vnd.google-apps.folder', parents: [FOLDER_ID] },
      fields: 'id'
    });

    // Copy template
    const copyRes = await drive.files.copy({
      fileId: TEMPLATE_ID,
      requestBody: { name: `${creatorName} - BLC Partnership Agreement`, parents: [folderRes.data.id] },
      fields: 'id'
    });
    const docId = copyRes.data.id;

    // Replace placeholders
    await docs.documents.batchUpdate({
      documentId: docId,
      requestBody: {
        requests: Object.entries({
          '[BLC CONTACT NAME]':  'Gibran Mims',
          '[BLC CONTACT EMAIL]': 'hello@thebikiniline.co',
          '[CREATOR NAME]':      creatorName,
          '[@TIKTOK HANDLE]':   `@${handle}`,
          '[CREATOR EMAIL]':     email,
          '[NUMBER OF VIDEOS]':  String(videoCount),
          '[START DATE]':        fmtDate(start),
          '[END DATE]':          fmtDate(end),
          '[TOTAL PAYMENT]':     totalDeal.toLocaleString(),
          '[50% OF TOTAL]':      halfDeposit.toLocaleString(),
          '[BLC INVOICE EMAIL]': 'partnerships@thebikiniline.co'
        }).map(([find, replace]) => ({
          replaceAllText: { containsText: { text: find, matchCase: true }, replaceText: replace }
        }))
      }
    });

    // Export as PDF
    const pdfRes = await drive.files.export(
      { fileId: docId, mimeType: 'application/pdf' },
      { responseType: 'arraybuffer' }
    );
    const pdfBuffer  = Buffer.from(pdfRes.data);
    const pdfBase64  = pdfBuffer.toString('base64');
    const safeName   = creatorName.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim();
    const pdfFilename = `${safeName} - BLC Contract.pdf`;

    // 4. Build welcome email body
    const firstName = creatorName.split(' ')[0];
    const emailBody = [
      `Hey ${firstName},`,
      ``,
      `So excited to have you on board with The Bikini Line Co. Please find your contract attached. Once you've had a chance to review and sign, send it back our way.`,
      ``,
      `A few quick next steps to get you started:`,
      ``,
      `1. Please send us an invoice for 50% of your first month's rate. You can send payment via PayPal or wire transfer, just let us know which you prefer.`,
      ``,
      `2. Also go ahead and send me your shipping address so we can get a fresh BBL Serum sent out to you. We want to make sure you have a new one to work with before you start posting.`,
      ``,
      `3. Join our Discord using this link: ${discordLink}. Once you're in, send us a DM and we'll move all future communication there.`,
      ``,
      `Before you go live we'll send you a posting schedule and content angles that are already converting so we're aligned before anything goes up. All of that will come through Discord once you're in.`,
      ``,
      `Can't wait to get started.`,
      ``,
      `Warmly,`,
      `Lu`
    ].join('\n');

    // 5. Create Gmail draft with PDF attached (RFC 2822 MIME message)
    const boundary = `BLC_BOUND_${Date.now()}`;
    const pdfLines = pdfBase64.match(/.{1,76}/g).join('\r\n');

    const mimeMsg = [
      `MIME-Version: 1.0`,
      email ? `To: ${email}` : `To: `,
      `Subject: Welcome to The Bikini Line Co.`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      ``,
      emailBody,
      ``,
      `--${boundary}`,
      `Content-Type: application/pdf; name="${pdfFilename}"`,
      `Content-Disposition: attachment; filename="${pdfFilename}"`,
      `Content-Transfer-Encoding: base64`,
      ``,
      pdfLines,
      ``,
      `--${boundary}--`
    ].join('\r\n');

    // Refresh Gmail tokens if needed
    const gmailAuth = getOAuthClient();
    gmailAuth.setCredentials(activeGmail);
    if (activeGmail.expiry_date && activeGmail.expiry_date < Date.now() + 60_000) {
      const { credentials } = await gmailAuth.refreshAccessToken();
      gmailTokens = credentials;
      await persistTokens(gmailTokens, gmailEmail);
      gmailAuth.setCredentials(credentials);
    }

    const gmail = google.gmail({ version: 'v1', auth: gmailAuth });
    const rawEncoded = Buffer.from(mimeMsg)
      .toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

    await gmail.users.drafts.create({
      userId: 'me',
      requestBody: { message: { raw: rawEncoded } }
    });

    // 6. Upsert roster entry (create or update by handle)
    const rosterData = {
      handle:             r.handle,
      name:               r.name || null,
      platform:           'TikTok',
      niche:              (r.product_category || '').split(',')[0].trim() || null,
      followers:          r.follower_count || null,
      email:              r.email || null,
      status:             'active',
      tier:               r.tier || null,
      video_count:        videoCount,
      start_date:         startDate,
      per_vid_rate:       rate,
      commission_rate:    20,
      content_submitted:  0,
      gmv:                0,
      affiliate_type:     'paid',
      top_videos:         [],
      creator_assessment: null
    };

    const { data: existing } = await supabase
      .from('roster').select('id').ilike('handle', r.handle).maybeSingle();

    let rosterEntry;
    if (existing?.id) {
      const { data } = await supabase
        .from('roster').update(rosterData).eq('id', existing.id).select().single();
      rosterEntry = data;
    } else {
      const { data } = await supabase
        .from('roster').insert([rosterData]).select().single();
      rosterEntry = data;
    }

    res.json({
      success:      true,
      halfDeposit,
      totalDeal,
      creatorName,
      rosterEntry,
      draftCreated: true,
      pdfBase64,
      pdfFilename
    });

  } catch (err) {
    console.error('[sign-flow] Error:', err);
    if (err.message?.includes('insufficientPermissions') || err.code === 403) {
      return res.status(403).json({ error: 'Google Drive permissions error. Make sure the correct account (hello@thebikiniline.co) is connected via New Batch.' });
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
  try { await supabase.from('app_settings').delete().in('key', ['gmail_tokens', 'gmail_email']); } catch (_) {}
  res.json({ disconnected: true });
});

// ── Drive-specific auth (separate account for hello@thebikiniline.co) ──

router.get('/drive-auth/url', (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: 'Google credentials not configured' });
  }
  const client = getDriveOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents'
    ],
    prompt: 'consent'
  });
  res.json({ url });
});

router.get('/drive-auth/callback', async (req, res) => {
  const { code, error } = req.query;
  const style = `font-family:system-ui,sans-serif;background:#0c0c10;color:#FFF6EB;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:12px;text-align:center;padding:24px`;
  if (error || !code) return res.send(`<html><body style="${style}"><h2 style="color:#f87171">Auth failed</h2><p style="color:#9090aa">You can close this tab.</p></body></html>`);
  try {
    const client = getDriveOAuthClient();
    const { tokens } = await client.getToken(code);
    driveTokens = tokens;
    try {
      client.setCredentials(tokens);
      const drive = google.drive({ version: 'v3', auth: client });
      const about = await drive.about.get({ fields: 'user' });
      driveEmail = about.data.user?.emailAddress || null;
    } catch (_) {}
    await persistSettings({ drive_tokens: driveTokens, ...(driveEmail ? { drive_email: { email: driveEmail } } : {}) });
    res.send(`<html><body style="${style}"><h2>Drive account connected.</h2><p style="color:#9090aa">You can close this tab.</p><script>window.close();</script></body></html>`);
  } catch (err) {
    res.send(`<html><body style="${style}"><h2 style="color:#f87171">Error: ${err.message}</h2></body></html>`);
  }
});

router.get('/drive-auth/status', (req, res) => {
  res.json({ connected: !!driveTokens, email: driveEmail });
});

router.delete('/drive-auth/disconnect', async (req, res) => {
  driveTokens = null;
  driveEmail  = null;
  try { await supabase.from('app_settings').delete().in('key', ['drive_tokens', 'drive_email']); } catch (_) {}
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

    // Process sequentially to stay under Gmail's rate limit
    const results = [];
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (const e of toSave) {
      try {
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

        results.push({ handle: e.handle, saved: true });
      } catch (draftErr) {
        console.error(`Draft failed for ${e.handle}:`, draftErr.message);
        results.push({ handle: e.handle, saved: false, error: draftErr.message });
      }

      // 150ms gap keeps well under Gmail's 10 req/sec per-user limit
      await sleep(150);
    }

    const saved   = results.filter(r => r.saved).length;
    const failed  = results.filter(r => !r.saved).length;

    res.json({ saved, failed, skipped: emails.length - toSave.length, results });
  } catch (err) {
    console.error('Save drafts error:', err);
    if (err.message?.includes('invalid_grant') || err.message?.includes('Token has been expired')) {
      gmailTokens = null;
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
