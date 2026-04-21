// ─── rateLimiter.js ──────────────────────────────────────────
const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: (parseInt(process.env.RATE_LIMIT_WINDOW) || 15) * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
  skip: (req) => req.path.includes('/stream'), // don't rate-limit audio streams
});

module.exports = rateLimiter;
