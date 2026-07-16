require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');

const outreachRoutes = require('./routes/outreach');
const rosterRoutes = require('./routes/roster');
const generateRoutes = require('./routes/generate');
const outreachGenRoutes = require('./routes/outreach-gen');
const tiktokRoutes = require('./routes/tiktok');
const settingsRoutes = require('./routes/settings');
const oembedRoutes = require('./routes/oembed');
const transcriptRoutes = require('./routes/transcript');
const supportRoutes    = require('./routes/support');
const challengeRoutes = require('./routes/challenge');
const challengeAdminRoutes = require('./routes/challenge-admin');
const tasksRoutes          = require('./routes/tasks');
const ideasRoutes          = require('./routes/ideas');
const contentCalendarRoutes = require('./routes/content-calendar');
const contentIdeasRoutes    = require('./routes/content-ideas');
const teamCalendarRoutes    = require('./routes/team-calendar');
const partnerOutreachRoutes    = require('./routes/partner-outreach');
const partnerOutreachGenRoutes = require('./routes/partner-outreach-gen');
const commentBankRoutes        = require('./routes/comment-bank');
const { requireAuth } = require('./middleware/auth');
const { startCron } = require('./cron/reminders');
const { startPartnerFollowupCron } = require('./cron/partner-followups');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(cookieParser(process.env.SESSION_SECRET || 'blc-os-secret-change-me'));
app.use(cors());
app.use(express.json());

// ── Challenge subdomain — redirect everything to signup ───────────
app.use((req, res, next) => {
  if (req.hostname === 'challenge.thebikiniline.co') {
    if (req.path === '/challenge/signup' || req.path.startsWith('/challenge/checkin') || req.path.startsWith('/api/') || req.path.startsWith('/img/') || req.path.startsWith('/css/') || req.path.startsWith('/js/')) return next();
    return res.redirect(301, '/challenge/signup');
  }
  next();
});

// ── Auth (before static so / redirects to login when password is set) ───
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

// ── Login route ───────────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.signedCookies.auth === 'ok') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    res.cookie('auth', 'ok', {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days
    });
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Incorrect password' });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('auth');
  res.json({ ok: true });
});

// ── Public challenge pages (no auth) ─────────────────────────────
app.get('/challenge/signup', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'challenge-signup.html'));
});

app.get('/challenge/checkin/:token', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'challenge-checkin.html'));
});

// ── Health ────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Existing routes ───────────────────────────────────────────────
app.use('/api/outreach', outreachRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/outreach-gen', outreachGenRoutes);
app.use('/api/tiktok', tiktokRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/oembed', oembedRoutes);
app.use('/api/transcript', transcriptRoutes);
app.use('/api/support',    supportRoutes);

// ── Challenge routes ──────────────────────────────────────────────
app.use('/api/challenge', challengeRoutes);
app.use('/api/challenge', challengeAdminRoutes);

// ── Tasks ─────────────────────────────────────────────────────────
app.use('/api/tasks',             tasksRoutes);
app.use('/api/ideas',             ideasRoutes);
app.use('/api/content-calendar',  contentCalendarRoutes);
app.use('/api/content-ideas',     contentIdeasRoutes);
app.use('/api/team-calendar',     teamCalendarRoutes);
app.use('/api/comment-bank',      commentBankRoutes);

// ── Pro Partner Outreach ──────────────────────────────────────────
app.use('/api/partner-outreach',     partnerOutreachRoutes);
app.use('/api/partner-outreach-gen', partnerOutreachGenRoutes);

// ── SPA fallback (serves index.html for all other GET requests) ───
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BLC OS running on http://localhost:${PORT}`);
  startCron();
  startPartnerFollowupCron();
});
