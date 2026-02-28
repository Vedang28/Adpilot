'use strict';

const BaseRule = require('../BaseRule');

/**
 * BrokenLinksRule — detects internal links that return 4xx or 5xx.
 *
 * Issues emitted:
 *   broken_internal_links (high)
 *
 * Data source: crawlResult.brokenLinks — populated by CrawlEngine's post-crawl
 * analysis pass.  Each entry is { from, to, statusCode }.
 *
 * affectedPages = the SOURCE pages containing the broken links (not the dead
 * destinations), because those are the pages that need fixing.
 *
 * The issue description also records the total number of unique broken
 * destinations so teams can prioritise the fix effort.
 */
class BrokenLinksRule extends BaseRule {
  evaluate({ brokenLinks }) {
    if (!brokenLinks || brokenLinks.length === 0) return [];

    // Source pages that contain at least one broken link
    const sourcePagesSet = new Set(brokenLinks.map((bl) => bl.from));

    // Unique broken destinations (the 404/5xx URLs)
    const brokenDestinations = [...new Set(brokenLinks.map((bl) => bl.to))];
    const destCount = brokenDestinations.length;
    const srcCount  = sourcePagesSet.size;

    return [
      this._buildIssue({
        id:             'broken_internal_links',
        severity:       'high',
        category:       'technical',
        affectedPages:  [...sourcePagesSet],
        impactScore:    15,
        description:    `${srcCount} page(s) contain links pointing to ${destCount} broken internal URL(s) (4xx/5xx). Broken links harm user experience, waste crawl budget, and signal poor site maintenance to search engines.`,
        recommendation: 'Audit all broken links and either fix the destination URLs, implement 301 redirects to the correct pages, or remove the broken links entirely. Use a crawl report to track all broken destinations.',
        autoFixable:    false,
      }),
    ];
  }
}

module.exports = BrokenLinksRule;
