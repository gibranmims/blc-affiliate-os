// Public paths — never require a session
const PUBLIC_PREFIXES = [
  '/challenge/signup',
  '/challenge/checkin',
  '/api/challenge/signup',
  '/api/challenge/checkin',
  '/login',
  '/api/login',
  '/api/health'
];

// Static asset extensions that should always be served without auth
const STATIC_EXT = /\.(css|js|ico|png|jpg|jpeg|svg|webp|woff|woff2|ttf|map)$/i;

function isPublic(path) {
  if (STATIC_EXT.test(path)) return true;
  return PUBLIC_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/') || path.startsWith(prefix + '?'));
}

function requireAuth(req, res, next) {
  // If ADMIN_PASSWORD is not configured, run open (dev mode / unset deployment)
  if (!process.env.ADMIN_PASSWORD) return next();
  // Challenge subdomain is fully public — bypass auth entirely
  if (req.hostname === 'challenge.thebikiniline.co') return next();
  if (isPublic(req.path)) return next();
  if (req.session && req.session.authed) return next();
  // API calls get 401, browser navigation gets redirect to login
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
}

module.exports = { requireAuth };
