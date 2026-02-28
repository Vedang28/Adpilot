'use strict';

/**
 * SEO Audit Engine — runtime configuration.
 *
 * All tunable constants live here so they can be overridden per environment
 * without touching business logic.  Plan-based limits (maxPages, etc.) live
 * in config/limits.js.
 */
module.exports = {

  // ── Crawl ─────────────────────────────────────────────────────────────────
  crawl: {
    /** Max Puppeteer tabs open simultaneously during BFS. */
    concurrency: 3,

    /** Per-page navigation timeout in ms. */
    timeout: 15_000,

    /** Hard cap on BFS depth — prevents infinite crawl on deeply-nested sites. */
    maxDepth: 8,

    /**
     * Puppeteer resource types to block during crawl.
     * Blocking images/fonts/stylesheets cuts page load time by ~60%.
     * 'script' is NOT blocked — JS execution is needed for SPA navigation.
     */
    blockedResourceTypes: ['image', 'font', 'stylesheet', 'media'],

    /** User-Agent sent with every request. */
    userAgent: 'AdPilot-SEO-Auditor/2.0 (+https://adpilot.io/bot)',

    /** Timeout for lightweight HTTP calls (robots.txt, sitemap.xml). */
    lightHttpTimeout: 5_000,
  },

  // ── Lighthouse ────────────────────────────────────────────────────────────
  lighthouse: {
    /** Max ms to wait for a Lighthouse run to complete on one page. */
    timeout: 60_000,

    /** 'desktop' | 'mobile' — affects throttling preset and viewport. */
    throttling: 'desktop',

    /**
     * Only run these audits.  Running the full Lighthouse suite takes ~30s per
     * page; limiting to core web vitals keeps it under 10s.
     */
    onlyAudits: [
      'first-contentful-paint',
      'largest-contentful-paint',
      'total-blocking-time',
      'cumulative-layout-shift',
      'interactive',
      'speed-index',
    ],
  },

  // ── Scoring ───────────────────────────────────────────────────────────────
  scoring: {
    /**
     * Category weights — must sum to 1.0.
     * Changing these here cascades to ScoringEngine automatically.
     */
    weights: {
      technical:   0.30,
      performance: 0.25,
      content:     0.25,
      structure:   0.20,
    },

    /**
     * Points deducted per issue instance.
     * Site-wide multiplier (×2) applied when >50% of pages are affected.
     */
    severityDeductions: {
      critical: 20,
      high:     10,
      medium:    5,
      low:       2,
    },

    /**
     * If an issue affects more than this fraction of crawled pages,
     * its deduction is doubled (site-wide severity).
     */
    siteWideCoverageThreshold: 0.5,

    /**
     * Score assigned to the performance category when all Lighthouse runs
     * fail (network blocked, JS error, etc.).  50 = neutral penalty so it
     * doesn't tank the overall score unfairly.
     */
    performanceFallbackScore: 50,
  },

  // ── Content thresholds (used by content rules) ────────────────────────────
  content: {
    title: {
      minLength: 30,
      maxLength: 60,
    },
    metaDescription: {
      minLength: 120,
      maxLength: 160,
    },
    minWordCount: 300,   // below this → thin_content
  },

  // ── Structure thresholds ──────────────────────────────────────────────────
  structure: {
    maxPageDepth: 4,     // below this → excessive_depth issue
    poorLinkingThreshold: 1, // inboundLinkCount <= this (and depth > 1) → poor_internal_linking
  },
};
