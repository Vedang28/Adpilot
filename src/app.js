'use strict';

const path    = require('path');
const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');

// Infrastructure
const correlationId  = require('./middleware/correlationId');
const sanitize       = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const logger         = require('./config/logger');

// Routes
const authRoutes        = require('./routes/authRoutes');
const campaignRoutes    = require('./routes/campaignRoutes');
const adRoutes          = require('./routes/adRoutes');
const analyticsRoutes   = require('./routes/analyticsRoutes');
const seoRoutes         = require('./routes/seoRoutes');
const ruleRoutes        = require('./routes/ruleRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const teamRoutes        = require('./routes/teamRoutes');

const app = express();

// ── Security ─────────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // relaxed for API; tighten in prod
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// ── Request hygiene ───────────────────────────────────────────────────────────
app.use(correlationId);
app.use(express.json({ limit: '1mb' }));
app.use(sanitize);

// ── Global rate limiter ───────────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ── Request logger ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
      correlationId: req.correlationId,
    });
  });
  next();
});

// ── Static pages ──────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
app.get('/',          (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/login.html',(req, res) => res.sendFile(path.join(ROOT, 'login.html')));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
    error: null,
    meta: {},
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth',         authRoutes);
app.use('/api/v1/campaigns',    campaignRoutes);
app.use('/api/v1',              adRoutes);
app.use('/api/v1/analytics',    analyticsRoutes);
app.use('/api/v1/seo',          seoRoutes);
app.use('/api/v1/rules',        ruleRoutes);
app.use('/api/v1/integrations', integrationRoutes);
app.use('/api/v1/team',         teamRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: { message: `${req.method} ${req.originalUrl} not found` },
    meta: { timestamp: new Date().toISOString() },
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
