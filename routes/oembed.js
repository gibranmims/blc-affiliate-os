const express = require('express');
const router = express.Router();

// Proxy TikTok oEmbed to avoid CORS issues in the browser
// GET /api/oembed?url=<tiktok_url>
router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });

  try {
    const oembedRes = await fetch(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
    );
    if (!oembedRes.ok) throw new Error(`TikTok oEmbed returned ${oembedRes.status}`);
    const data = await oembedRes.json();
    res.json({
      thumbnail_url: data.thumbnail_url || null,
      title:        data.title        || '',
      author_name:  data.author_name  || ''
    });
  } catch (err) {
    // Return null thumbnail gracefully — don't break the save
    res.json({ thumbnail_url: null, title: '', author_name: '' });
  }
});

module.exports = router;
