'use strict';

/**
 * app.js
 *
 * FIX: Removed `const searchRoutes = require('./routes/search')` from the
 * top of the file.  That line was a leftover from an earlier refactor.
 * The search router is already correctly mounted inside routes/index.js:
 *   router.use('/search', require('./search'));
 * Having a second unconsumed require here causes a startup crash if the
 * file path ever changes, and generates a confusing "searchRoutes is
 * defined but never used" ESLint error.
 */

const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const config    = require('./config');
const routes    = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');
const logger    = require('./utils/logger');

const app = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// Using config.allowedOrigins instead of '*' so you can restrict in production
// via the ALLOWED_ORIGINS environment variable.
app.use(cors({
  origin: config.allowedOrigins || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max:      config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests. Please try again later.' },
});
app.use('/api', limiter);

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`→ ${req.method} ${req.originalUrl}`);
  next();
});

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api', routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Centralised error handler (must be last) ──────────────────────────────────
app.use(errorHandler);

module.exports = app;