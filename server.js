require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const outreachRoutes = require('./routes/outreach');
const rosterRoutes = require('./routes/roster');
const generateRoutes = require('./routes/generate');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/outreach', outreachRoutes);
app.use('/api/roster', rosterRoutes);
app.use('/api/generate', generateRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`BLC Affiliate OS running on http://localhost:${PORT}`);
});
