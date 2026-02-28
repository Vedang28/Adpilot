'use strict';

const BaseRule = require('../BaseRule');

/**
 * OrphanPageRule — detects pages with no inbound internal links.
 *
 * Issues emitted:
 *   orphan_page (high)
 *
 * An orphan page is a crawled page at depth > 0 that no other crawled page
 * links to.  This field is computed by CrawlEngine._computeInboundLinks()
 * after BFS completes.
 *
 * Why high: orphan pages receive no PageRank from the rest of the site.
 * Googlebot may also fail to discover them at all if they aren't in the
 * sitemap.  They are "dark matter" — existing but invisible.
 *
 * The homepage (depth === 0) is intentionally excluded: it is the BFS seed
 * and will never have inbound links within the crawled set.
 */
class OrphanPageRule extends BaseRule {
  evaluate({ pages }) {
    const live   = this._livePages(pages);
    const orphans = live.filter((p) => p.isOrphan).map((p) => p.url);

    if (!orphans.length) return [];

    return [
      this._buildIssue({
        id:             'orphan_page',
        severity:       'high',
        category:       'structure',
        affectedPages:  orphans,
        impactScore:    15,
        description:    `${orphans.length} page(s) are orphaned — no other crawled page links to them. Orphan pages receive no link equity and may not be discovered by Googlebot unless listed in the sitemap.`,
        recommendation: 'Add internal links to every important page from at least 2–3 contextually relevant pages. If a page is intentionally unlisted (e.g., a landing page), ensure it appears in the sitemap and is tracked separately.',
        autoFixable:    false,
      }),
    ];
  }
}

module.exports = OrphanPageRule;
