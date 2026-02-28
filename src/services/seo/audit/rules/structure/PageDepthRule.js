'use strict';

const BaseRule   = require('../BaseRule');
const SEO_CONFIG = require('../../../../../config/seo');

/**
 * PageDepthRule — detects pages buried too deep in the site hierarchy.
 *
 * Issues emitted:
 *   excessive_depth (medium)
 *
 * Pages deeper than config.structure.maxPageDepth clicks from the homepage
 * receive diminished crawl priority and accumulate less link equity because
 * fewer internal links point to them.
 *
 * Depth 0 = homepage (seed URL), depth 1 = one click away, etc.
 * The default threshold is 4 (configurable in seo.js).
 */
class PageDepthRule extends BaseRule {
  evaluate({ pages }) {
    const live      = this._livePages(pages);
    const maxDepth  = SEO_CONFIG.structure.maxPageDepth;
    const deep      = live.filter((p) => p.depth > maxDepth).map((p) => p.url);

    if (!deep.length) return [];

    const deepest = Math.max(...live.filter((p) => p.depth > maxDepth).map((p) => p.depth));

    return [
      this._buildIssue({
        id:             'excessive_depth',
        severity:       'medium',
        category:       'structure',
        affectedPages:  deep,
        impactScore:    8,
        description:    `${deep.length} page(s) are more than ${maxDepth} clicks from the homepage (deepest: ${deepest} clicks). Deep pages receive less crawl budget and link equity from the rest of the site.`,
        recommendation: `Restructure navigation so every important page is reachable within ${maxDepth} clicks. Add breadcrumb navigation, update internal linking to promote deep pages from higher-level pages, and consider flattening the URL structure.`,
        autoFixable:    false,
      }),
    ];
  }
}

module.exports = PageDepthRule;
