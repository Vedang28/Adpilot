'use strict';

const BaseRule = require('../BaseRule');

/**
 * HttpsRule — detects pages served over HTTP instead of HTTPS.
 *
 * Issues emitted:
 *   https_not_enforced (critical) — a live page was fetched over HTTP
 *
 * Why critical: HTTPS is a confirmed Google ranking signal.  Mixed HTTP/HTTPS
 * content also triggers browser security warnings that harm conversion rates.
 *
 * Detection: Puppeteer follows redirects automatically, so if a site properly
 * redirects HTTP → HTTPS, the page's `isHttps` flag will be true.  We only
 * flag pages that were actually served from an HTTP URL.
 */
class HttpsRule extends BaseRule {
  evaluate({ pages }) {
    const live      = this._livePages(pages);
    const httpPages = live.filter((p) => !p.isHttps).map((p) => p.url);

    if (!httpPages.length) return [];

    return [
      this._buildIssue({
        id:             'https_not_enforced',
        severity:       'critical',
        category:       'technical',
        affectedPages:  httpPages,
        impactScore:    25,
        description:    `${httpPages.length} page(s) are served over HTTP. HTTPS is a Google ranking signal and HTTP pages display browser security warnings.`,
        recommendation: 'Obtain and install an SSL/TLS certificate. Configure your server to issue a 301 permanent redirect from all HTTP URLs to their HTTPS equivalents. Update all internal links to use https://.',
        autoFixable:    false,
      }),
    ];
  }
}

module.exports = HttpsRule;
