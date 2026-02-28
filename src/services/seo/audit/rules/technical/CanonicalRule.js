'use strict';

const BaseRule = require('../BaseRule');

/**
 * CanonicalRule — detects missing canonical link elements.
 *
 * Issues emitted:
 *   missing_canonical (medium) — no <link rel="canonical"> tag on page
 *
 * Note: a mismatched canonical (pointing to a different URL) is intentionally
 * not flagged here — the canonical may be legitimately pointing to a preferred
 * version.  That requires deeper semantic analysis beyond what crawl data
 * alone can determine.
 */
class CanonicalRule extends BaseRule {
  evaluate({ pages }) {
    const live    = this._livePages(pages);
    const missing = live.filter((p) => !p.canonicalTag).map((p) => p.url);

    if (!missing.length) return [];

    return [
      this._buildIssue({
        id:             'missing_canonical',
        severity:       'medium',
        category:       'technical',
        affectedPages:  missing,
        impactScore:    8,
        description:    `${missing.length} page(s) are missing a canonical URL tag. Without it, search engines may index duplicate or near-duplicate versions of the page.`,
        recommendation: 'Add <link rel="canonical" href="https://yourdomain.com/page-url"> to every page\'s <head>. For the preferred URL, the canonical should point to itself.',
        autoFixable:    true,
      }),
    ];
  }
}

module.exports = CanonicalRule;
