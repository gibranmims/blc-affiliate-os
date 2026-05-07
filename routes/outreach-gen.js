const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const Anthropic = require('@anthropic-ai/sdk');
const { google } = require('googleapis');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

let gmailTokens = null;

const SENDERS = ['Tamar', 'Lu'];

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

function getFirstName(fullName) {
  const first = (fullName || '').trim().split(/\s+/)[0];
  return first || 'there';
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
  const firstName = getFirstName(creator.name);
  const bundle = getBundleSize(creator.follower_count);

  const msg = await anthropic.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 350,
    messages: [{
      role: 'user',
      content: `Write a short outreach email from ${sender} at The Bikini Line Co to a creator.

Creator first name: ${firstName}
Handle: @${creator.handle}
Category: ${creator.product_category || 'lifestyle/beauty'}

Hard rules — break any of these and the email is rejected:
1. First line must be exactly: Hey ${firstName},
2. NEVER use em dashes (—) or en dashes. Not once.
3. NEVER use: "I hope", "I wanted to reach out", "I'm excited", "touch base", "circle back", "delighted", "pleasure", "innovative", "leverage", "synergy", "amazing opportunity", "perfect fit", or any phrase that sounds like AI wrote it
4. Sound like a real 28-year-old woman texting a friend, not a marketer writing a cold email
5. Total length: 60 to 90 words max
6. Put one blank line between every 1 to 2 sentences. This spacing is required.
7. Introduce yourself as ${sender} from The Bikini Line Co (bikini line skincare)
8. Say you're looking for creators for a paid collab: fixed monthly rate plus commission on sales
9. Mention a ${bundle}-video bundle
10. Ask what their rate would look like for that
11. Last line is only: ${sender}

Output only the email body. No subject line. No preamble. Start with Hey ${firstName},`
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
        const sender = SENDERS[(i + idx) % 2];
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
            sender:              SENDERS[(i + idx) % 2],
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
  const { name, handle, askedRate, counterOfferAmount, tier, sender } = req.body;
  if (!name || !counterOfferAmount) return res.status(400).json({ error: 'name and counterOfferAmount required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const firstName = getFirstName(name);
  const senderName = sender || 'Tamar';

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Write a short counter offer email from ${senderName} at The Bikini Line Co to a creator who replied with their rates.

Creator first name: ${firstName}
Handle: @${handle || ''}
Their asked rate: $${askedRate || '?'}/video
Our counter offer: $${counterOfferAmount}/video

Hard rules:
1. First line must be exactly: Hey ${firstName},
2. NEVER use em dashes or en dashes. Not once.
3. Sound like a real 28-year-old woman texting a friend, not a marketer
4. Total length: 50 to 80 words max
5. Put one blank line between every 1 to 2 sentences
6. Acknowledge their reply naturally (short, not over the top)
7. State our counter offer of $${counterOfferAmount}/video clearly
8. Keep it warm and open so they feel comfortable responding
9. Last line is only: ${senderName}

Output only the email body. No subject line. No preamble. Start with Hey ${firstName},`
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
    res.send(`<html><body style="${style}"><h2>Gmail connected.</h2><p style="color:#9090aa">You can close this tab and go back to BLC Affiliate OS.</p><script>window.close();</script></body></html>`);
  } catch (err) {
    res.send(`<html><body style="${style}"><h2 style="color:#f87171">Error: ${err.message}</h2><p style="color:#9090aa">You can close this tab.</p></body></html>`);
  }
});

// GET /api/outreach-gen/auth/status
router.get('/auth/status', (req, res) => {
  res.json({ connected: !!gmailTokens });
});

// DELETE /api/outreach-gen/auth/disconnect
router.delete('/auth/disconnect', (req, res) => {
  gmailTokens = null;
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
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const results = await Promise.all(
      toSave.map(async (e) => {
        const mime = [
          `To: ${e.email}`,
          `Subject: ${e.subject}`,
          `MIME-Version: 1.0`,
          `Content-Type: text/plain; charset=utf-8`,
          ``,
          e.body
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
