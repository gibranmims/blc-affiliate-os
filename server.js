require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');

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
const { requireAuth } = require('./middleware/auth');
const { startCron } = require('./cron/reminders');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Session ───────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'blc-os-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.use(cors());
app.use(express.json());

// ── Auth (before static so / redirects to login when password is set) ───
app.use(requireAuth);
app.use(express.static(path.join(__dirname, 'public')));

// ── Login route ───────────────────────────────────────────────────
app.get('/login', (req, res) => {
  if (req.session?.authed) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password && password === process.env.ADMIN_PASSWORD) {
    req.session.authed = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Incorrect password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ── Public challenge pages (no auth) ─────────────────────────────
// Root redirect for challenge subdomain
app.get('/', (req, res, next) => {
  if (req.hostname === 'challenge.thebikiniline.co') {
    return res.redirect(301, '/challenge/signup');
  }
  next();
});

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

// ── SPA fallback (serves index.html for all other GET requests) ───
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`BLC OS running on http://localhost:${PORT}`);
  startCron();
});
