const express = require('express');
const multer = require('multer');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { uploadPhoto } = require('../lib/storage');
const { createCustomerFolder, uploadPhoto: driveUpload } = require('../lib/drive');
const email = require('../lib/email');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(req, file, cb) {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.heic'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only jpg, png, webp, heic images are accepted'));
  }
});

function supabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// Calculate check-in windows for all 4 weeks based on signup date
function buildCheckinWindows(signupDate) {
  const base = new Date(signupDate);
  const rows = [];
  // weeks: 2, 4, 6, 8  → offsets in days: 14, 28, 42, 56
  [14, 28, 42, 56].forEach(dayOffset => {
    const weekNum = dayOffset / 7;
    const opens = new Date(base);
    opens.setDate(opens.getDate() + dayOffset - 3);  // day 11, 25, 39, 53
    const closes = new Date(base);
    closes.setDate(closes.getDate() + dayOffset + 3); // day 17, 31, 45, 59
    rows.push({ week_number: weekNum, window_opens_at: opens.toISOString(), window_closes_at: closes.toISOString() });
  });
  return rows;
}

// ── POST /api/challenge/signup ────────────────────────────────────

router.post('/signup', upload.single('photo'), async (req, res) => {
  try {
    const { name, email: customerEmail, order_number } = req.body;

    if (!name || !customerEmail || !order_number) {
      return res.status(400).json({ error: 'name, email, and order_number are required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'A before photo is required' });
    }

    const db = supabase();

    // One-per-email check
    const { data: existing } = await db
      .from('challengers')
      .select('id')
      .eq('email', customerEmail.toLowerCase().trim())
      .maybeSingle();
    if (existing) {
      return res.status(409).json({ error: 'This email has already entered the challenge' });
    }

    // Insert challenger row first to get the UUID
    const signupDate = new Date().toISOString();
    const { data: challenger, error: insertErr } = await db
      .from('challengers')
      .insert({ name: name.trim(), email: customerEmail.toLowerCase().trim(), order_number: order_number.trim(), signup_date: signupDate })
      .select()
      .single();
    if (insertErr) throw insertErr;

    // Upload week 0 photo
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const storagePath = `${challenger.id}/week_0${ext}`;
    await uploadPhoto(req.file.buffer, storagePath, req.file.mimetype);

    // Google Drive — create customer folder & upload (non-fatal if Drive not configured)
    let driveFolderId = null;
    let week0DriveId = null;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID) {
      try {
        driveFolderId = await createCustomerFolder(name.trim(), customerEmail.toLowerCase().trim());
        week0DriveId = await driveUpload(driveFolderId, req.file.buffer, `week_0${ext}`, req.file.mimetype);
      } catch (driveErr) {
        console.error('Drive upload failed (non-fatal):', driveErr.message);
      }
    }

    // Update challenger with photo paths
    await db.from('challengers').update({
      week0_photo_url: storagePath,
      week0_drive_file_id: week0DriveId,
      drive_folder_id: driveFolderId
    }).eq('id', challenger.id);

    // Pre-generate 4 check-in rows
    const windows = buildCheckinWindows(signupDate);
    await db.from('challenge_checkins').insert(
      windows.map(w => ({ challenger_id: challenger.id, ...w }))
    );

    // Emails (non-fatal)
    try {
      await Promise.all([
        email.sendSignupConfirmation({ ...challenger, signup_date: signupDate }),
        email.notifyTeamNewSignup({ ...challenger, order_number: order_number.trim() })
      ]);
    } catch (emailErr) {
      console.error('Signup email failed (non-fatal):', emailErr.message);
    }

    res.json({ success: true, challenger_id: challenger.id });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Signup failed' });
  }
});

// ── POST /api/challenge/checkin/:token ───────────────────────────

router.post('/checkin/:token', upload.single('photo'), async (req, res) => {
  try {
    const { token } = req.params;
    const { used_consistently, notes } = req.body;

    const db = supabase();

    // Look up the token
    const { data: checkin, error: tokenErr } = await db
      .from('challenge_checkins')
      .select('*, challengers(*)')
      .eq('token', token)
      .maybeSingle();

    if (tokenErr || !checkin) return res.status(404).json({ error: 'Check-in link not found' });
    if (checkin.submitted_at) return res.status(409).json({ error: 'This check-in has already been submitted' });

    const now = new Date();
    const opens = new Date(checkin.window_opens_at);
    const closes = checkin.grace_closes_at ? new Date(checkin.grace_closes_at) : new Date(checkin.window_closes_at);
    const challenger = checkin.challengers;

    if (challenger.status === 'disqualified') {
      return res.status(410).json({ error: 'This entry has been disqualified' });
    }
    if (now < opens) {
      return res.status(425).json({ error: `This check-in opens on ${opens.toLocaleDateString('en-US', { month:'long', day:'numeric' })}` });
    }
    if (now > closes) {
      return res.status(410).json({ error: 'This check-in window has closed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'A photo is required' });
    }

    // Upload photo
    const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const storagePath = `${challenger.id}/week_${checkin.week_number}${ext}`;
    await uploadPhoto(req.file.buffer, storagePath, req.file.mimetype);

    // Drive upload (non-fatal)
    let driveFileId = null;
    if (challenger.drive_folder_id && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        driveFileId = await driveUpload(challenger.drive_folder_id, req.file.buffer, `week_${checkin.week_number}${ext}`, req.file.mimetype);
      } catch (driveErr) {
        console.error('Drive upload failed (non-fatal):', driveErr.message);
      }
    }

    // Update check-in
    const submittedAt = new Date().toISOString();
    await db.from('challenge_checkins').update({
      photo_url: storagePath,
      drive_file_id: driveFileId,
      used_consistently: used_consistently === 'true' || used_consistently === true,
      notes: notes || null,
      submitted_at: submittedAt
    }).eq('id', checkin.id);

    // Check if all 4 check-ins are now complete
    const { data: allCheckins } = await db
      .from('challenge_checkins')
      .select('submitted_at')
      .eq('challenger_id', challenger.id);
    const allDone = allCheckins && allCheckins.every(c => c.id === checkin.id ? true : !!c.submitted_at);

    if (allDone) {
      await db.from('challengers').update({ status: 'completed' }).eq('id', challenger.id);
      try {
        await Promise.all([
          email.sendCongratulations(challenger),
          email.notifyTeamCompleted(challenger)
        ]);
      } catch (e) { console.error('Completion email failed (non-fatal):', e.message); }
    } else {
      try {
        await email.notifyTeamCheckin(challenger, { ...checkin, used_consistently: used_consistently === 'true', notes });
      } catch (e) { console.error('Check-in team notification failed (non-fatal):', e.message); }
    }

    res.json({ success: true, all_complete: allDone });
  } catch (err) {
    console.error('Check-in error:', err);
    res.status(500).json({ error: err.message || 'Check-in failed' });
  }
});

// ── GET /api/challenge/checkin-info/:token (for public page to load metadata) ──

router.get('/checkin-info/:token', async (req, res) => {
  try {
    const db = supabase();
    const { data: checkin } = await db
      .from('challenge_checkins')
      .select('week_number, window_opens_at, window_closes_at, grace_closes_at, submitted_at, challengers(name, status)')
      .eq('token', req.params.token)
      .maybeSingle();
    if (!checkin) return res.status(404).json({ error: 'Link not found' });

    const now = new Date();
    const opens = new Date(checkin.window_opens_at);
    const closes = checkin.grace_closes_at ? new Date(checkin.grace_closes_at) : new Date(checkin.window_closes_at);

    res.json({
      week_number: checkin.week_number,
      challenger_name: checkin.challengers?.name,
      status: checkin.challengers?.status,
      already_submitted: !!checkin.submitted_at,
      window_open: now >= opens,
      window_closed: now > closes,
      opens_at: checkin.window_opens_at,
      closes_at: closes.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
