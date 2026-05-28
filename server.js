require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const outreachRoutes = require('./routes/outreach');
const rosterRoutes = require('./routes/roster');
const generateRoutes = require('./routes/generate');
const outreachGenRoutes = require('./routes/outreach-gen');
const tiktokRoutes = require('./routes/tiktok');
const settingsRoutes = require('./routes/settings');
const oembedRoutes = require('./routes/oembed');
const transcriptRoutes = require('./routes/transcript');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/outreach', outreachRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/outreach-gen', outreachGenRoutes);
app.use('/api/tiktok', tiktokRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/oembed', oembedRoutes);
app.use('/api/transcript', transcriptRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`BLC Affiliate OS running on http://localhost:${PORT}`);
});
