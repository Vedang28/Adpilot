'use strict';

const puppeteer  = require('puppeteer');
const { URL }    = require('url');
const SEO_CONFIG = require('../../../../config/seo');
const logger     = require('../../../../config/logger');

/**
 * Lighthouse metric audit IDs → our internal key + unit.
 * Keep in sync with SEO_CONFIG.lighthouse.onlyAudits.
 */
const METRIC_MAP = {
  'first-contentful-paint':   { key: 'fcp', unit: 'ms'       },
  'largest-contentful-paint': { key: 'lcp', unit: 'ms'       },
  'total-blocking-time':      { key: 'tbt', unit: 'ms'       },
  'cumulative-layout-shift':  { key: 'cls', unit: 'unitless' },
  'speed-index':              { key: 'si',  unit: 'ms'       },
  'interactive':              { key: 'tti', unit: 'ms'       },
};

/**
 * Lighthouse is ESM-only from v10+. We cache the import so it only happens once
 * per process lifecycle — no repeated dynamic-import overhead.
 *
 * @type {Function|null}
 */
let _lighthouseFn = null;

async function loadLighthouse() {
  if (_lighthouseFn) return _lighthouseFn;
  try {
    // Works for lighthouse v9 (CJS)
    const mod = require('lighthouse'); // eslint-disable-line global-require
    _lighthouseFn = typeof mod === 'function' ? mod : mod.default;
  } catch {
    // lighthouse v10+ is ESM-only — use dynamic import from CJS module
    const mod = await import('lighthouse');
    _lighthouseFn = mod.default;
  }
  return _lighthouseFn;
}

/**
 * PerformanceEngine — runs Lighthouse against selected pages post-crawl.
 *
 * Architecture decisions:
 *
 * 1. Separate browser from CrawlEngine's browser.
 *    Lighthouse takes CDP control of any open page, which would interfere
 *    with Puppeteer's page lifecycle.  A fresh browser is launched exclusively
 *    for Lighthouse — isolated, then closed in `finally`.
 *
 * 2. Serial execution.
 *    Running multiple Lighthouse instances against the same Chrome process
 *    causes flaky results and OOM in containers.  Pages are audited one at a
 *    time.  This is slower but reliable.
 *
 * 3. Page selection: homepage first, then top pages by inbound link count.
 *    High-inbound pages are the most important for SEO link equity — if they
 *    perform poorly, it has outsized ranking impact.
 *
 * 4. Fallback on complete failure.
 *    If Lighthouse fails entirely (binary missing, network blocked, OOM),
 *    we return a pre-configured fallback score (50) rather than failing the
 *    whole audit.  The `fallback: true` flag lets the UI surface a warning.
 *
 * 5. Per-run timeout via Promise.race.
 *    Lighthouse can hang on certain pages (WebSocket apps, video streams).
 *    A per-run timeout kills the hanging promise; the browser is still closed
 *    in `finally`.
 *
 * Output shape:
 * {
 *   score:         number,    // 0-100, average across analyzed pages
 *   metrics: {
 *     fcp: { value: number, unit: 'ms',       displayValue: string },
 *     lcp: { value: number, unit: 'ms',       displayValue: string },
 *     tbt: { value: number, unit: 'ms',       displayValue: string },
 *     cls: { value: number, unit: 'unitless', displayValue: string },
 *     si:  { value: number, unit: 'ms',       displayValue: string },
 *     tti: { value: number, unit: 'ms',       displayValue: string },
 *   },
 *   pagesAnalyzed: number,
 *   pageResults:   { url, score, metrics }[],
 *   fallback:      boolean,
 *   fallbackReason?: string,
 * }
 */
class PerformanceEngine {
  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Run Lighthouse on the most important pages from a completed crawl.
   *
   * @param {CrawlResult} crawlResult      - from CrawlEngine.crawl()
   * @param {object}      options
   * @param {number}      [options.pagesLimit] - max pages to audit (from plan limits)
   * @returns {Promise<PerformanceResult>}
   */
  async analyze(crawlResult, { pagesLimit = 5 } = {}) {
    // ── 1. Select candidate pages ─────────────────────────────────────────────
    const candidates = this._selectPages(crawlResult, pagesLimit);

    if (candidates.length === 0) {
      return this._fallback('No live pages available for Lighthouse analysis');
    }

    // ── 2. Pre-load Lighthouse (handles ESM compat once per process) ──────────
    let lighthouse;
    try {
      lighthouse = await loadLighthouse();
    } catch (loadErr) {
      logger.warn('PerformanceEngine: Lighthouse not loadable', { err: loadErr.message });
      return this._fallback('Lighthouse package could not be loaded');
    }

    // ── 3. Launch a dedicated browser for Lighthouse ──────────────────────────
    let browser;
    const pageResults = [];

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--disable-extensions',
        ],
      });

      logger.debug('PerformanceEngine: browser launched', {
        pagesCount: candidates.length,
      });

      // Extract CDP port from the ws endpoint Puppeteer exposes
      const wsEndpoint = browser.wsEndpoint();
      const port       = parseInt(new URL(wsEndpoint).port, 10);

      // ── 4. Run Lighthouse serially ─────────────────────────────────────────
      for (const page of candidates) {
        const result = await this._runOnePage(lighthouse, page.url, port);
        if (result) {
          pageResults.push(result);
          logger.debug('PerformanceEngine: page scored', {
            url:   page.url,
            score: result.score,
          });
        }
      }
    } catch (err) {
      logger.warn('PerformanceEngine: browser/Lighthouse fatal error', { err: err.message });
      return this._fallback(err.message);
    } finally {
      if (browser) {
        await browser.close().catch((e) =>
          logger.warn('PerformanceEngine: browser.close() error', { err: e.message })
        );
      }
    }

    if (pageResults.length === 0) {
      return this._fallback('All Lighthouse runs failed for selected pages');
    }

    // ── 5. Aggregate across all pages ─────────────────────────────────────────
    return this._aggregate(pageResults);
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Select which pages to run Lighthouse against.
   *
   * Priority order:
   *   1. Homepage (depth 0) — always first if crawled
   *   2. Pages sorted by inboundLinkCount DESC — most linked = most important
   *
   * Only live (non-failed, 2xx) pages are eligible.
   *
   * @param {CrawlResult} crawlResult
   * @param {number}      limit
   * @returns {PageData[]}
   */
  _selectPages(crawlResult, limit) {
    const live = crawlResult.pages.filter(
      (p) => !p.failed && p.statusCode >= 200 && p.statusCode < 300
    );

    const homepage = live.find((p) => p.depth === 0);
    const rest     = live
      .filter((p) => p.depth > 0)
      .sort((a, b) => (b.inboundLinkCount ?? 0) - (a.inboundLinkCount ?? 0))
      .slice(0, limit - (homepage ? 1 : 0));

    return homepage ? [homepage, ...rest] : rest.slice(0, limit);
  }

  /**
   * Run Lighthouse on a single URL, returning a structured result or null on failure.
   * Times out after SEO_CONFIG.lighthouse.timeout ms.
   *
   * Lighthouse is configured to:
   *   - Only run performance category (skip accessibility, SEO, best-practices)
   *   - Only compute the audits in SEO_CONFIG.lighthouse.onlyAudits
   *   - Use desktop emulation by default (configurable via SEO_CONFIG.lighthouse.throttling)
   *
   * @param {Function} lighthouseFn
   * @param {string}   url
   * @param {number}   port  - Chrome CDP port
   * @returns {Promise<{url, score, metrics}|null>}
   */
  async _runOnePage(lighthouseFn, url, port) {
    const isDesktop = SEO_CONFIG.lighthouse.throttling === 'desktop';

    const flags = {
      port,
      output:          'json',
      logLevel:        'error',
      onlyCategories:  ['performance'],
      // Desktop emulation: disable mobile throttling and use desktop viewport
      ...(isDesktop && {
        formFactor: 'desktop',
        throttling: {
          rttMs:                40,
          throughputKbps:       10_240,
          cpuSlowdownMultiplier: 1,
          requestLatencyMs:     0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps:  0,
        },
        screenEmulation: {
          mobile:           false,
          width:            1350,
          height:           940,
          deviceScaleFactor: 1,
          disabled:          false,
        },
      }),
    };

    const config = {
      extends:  'lighthouse:default',
      settings: {
        onlyAudits: SEO_CONFIG.lighthouse.onlyAudits,
      },
    };

    const runPromise = lighthouseFn(url, flags, config);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Lighthouse timed out on ${url} after ${SEO_CONFIG.lighthouse.timeout}ms`)),
        SEO_CONFIG.lighthouse.timeout
      )
    );

    let lhr;
    try {
      const result = await Promise.race([runPromise, timeoutPromise]);
      lhr = result?.lhr ?? result; // v9 returns { lhr } directly; v10 returns { lhr } wrapped
    } catch (err) {
      logger.warn('PerformanceEngine: Lighthouse run failed', { url, err: err.message });
      return null;
    }

    if (!lhr || !lhr.categories?.performance) {
      logger.warn('PerformanceEngine: no performance category in LHR', { url });
      return null;
    }

    // ── Extract score (0-100) ──────────────────────────────────────────────
    const score = Math.round((lhr.categories.performance.score ?? 0) * 100);

    // ── Extract per-metric values ──────────────────────────────────────────
    const metrics = {};
    for (const [auditId, { key, unit }] of Object.entries(METRIC_MAP)) {
      const audit = lhr.audits?.[auditId];
      if (audit) {
        metrics[key] = {
          value:        audit.numericValue   != null ? parseFloat(audit.numericValue.toFixed(unit === 'unitless' ? 4 : 0)) : null,
          unit,
          displayValue: audit.displayValue  ?? null,
          score:        audit.score          != null ? Math.round(audit.score * 100) : null,
        };
      }
    }

    return { url, score, metrics };
  }

  /**
   * Aggregate per-page results into a single PerformanceResult.
   *
   * Score: arithmetic mean of all page scores, rounded to nearest integer.
   * Metrics: arithmetic mean of numeric values across all pages.
   * Display value: re-derived from the averaged numeric value.
   *
   * @param {{ url, score, metrics }[]} pageResults
   * @returns {PerformanceResult}
   */
  _aggregate(pageResults) {
    // Average score
    const scores    = pageResults.map((r) => r.score);
    const avgScore  = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    // Collect all metric keys seen across any page
    const allKeys   = new Set(pageResults.flatMap((r) => Object.keys(r.metrics)));
    const metrics   = {};

    for (const key of allKeys) {
      const entries = pageResults
        .map((r) => r.metrics[key])
        .filter(Boolean);

      const values = entries.map((e) => e.value).filter((v) => v != null);
      if (values.length === 0) continue;

      const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
      const unit     = entries[0].unit;

      metrics[key] = {
        value:        unit === 'unitless'
          ? parseFloat(avgValue.toFixed(4))
          : Math.round(avgValue),
        unit,
        displayValue: this._humanize(avgValue, unit),
        score:        null, // aggregate score not meaningful per Lighthouse thresholds
      };
    }

    return {
      score:         avgScore,
      metrics,
      pagesAnalyzed: pageResults.length,
      pageResults,
      fallback:      false,
    };
  }

  /**
   * Format a raw numeric value into a human-readable string.
   *
   * @param {number} value
   * @param {string} unit  'ms' | 'unitless'
   * @returns {string}
   */
  _humanize(value, unit) {
    if (unit === 'ms') {
      return value >= 1000
        ? `${(value / 1000).toFixed(1)} s`
        : `${Math.round(value)} ms`;
    }
    if (unit === 'unitless') {
      return parseFloat(value.toFixed(4)).toString();
    }
    return String(Math.round(value));
  }

  /**
   * Build a fallback PerformanceResult when Lighthouse cannot run.
   *
   * The fallback score (default 50) is intentionally neutral — it doesn't
   * tank the overall audit score unfairly when Chrome isn't available.
   *
   * @param {string} reason
   * @returns {PerformanceResult}
   */
  _fallback(reason) {
    logger.warn('PerformanceEngine: returning fallback result', { reason });
    return {
      score:          SEO_CONFIG.scoring.performanceFallbackScore,
      metrics:        {},
      pagesAnalyzed:  0,
      pageResults:    [],
      fallback:       true,
      fallbackReason: reason,
    };
  }
}

module.exports = new PerformanceEngine();
