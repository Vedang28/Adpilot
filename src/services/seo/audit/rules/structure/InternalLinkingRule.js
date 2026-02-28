'use strict';

const BaseRule   = require('../BaseRule');
const SEO_CONFIG = require('../../../../../config/seo');

/**
 * InternalLinkingRule — detects pages with poor internal link equity.
 *
 * Issues emitted:
 *   poor_internal_linking (low)
 *
 * A page is considered poorly linked when all of the following are true:
 *   1. It is a live (non-failed) page
 *   2. Its BFS depth > 1 (depth-1 pages are directly linked from the homepage,
 *      which is acceptable — one inbound link from the root is fine)
 *   3. Its inboundLinkCount <= config.structure.poorLinkingThreshold (default: 1)
 *   4. It is NOT already flagged as an orphan (isOrphan = false)
 *      — orphan_page (high) already covers the zero-links case
 *
 * In practice this catches pages that are linked only from one other page
 * at depth 2+ — they have a link from somewhere but are not well-integrated
 * into the site's internal link graph.
 */
class InternalLinkingRule extends BaseRule {
  evaluate({ pages }) {
    const live      = this._livePages(pages);
    const threshold = SEO_CONFIG.structure.poorLinkingThreshold;

    const poorly = live
      .filter(
        (p) =>
          p.depth > 1 &&
          !p.isOrphan &&
          p.inboundLinkCount <= threshold
      )
      .map((p) => p.url);

    if (!poorly.length) return [];

    return [
      this._buildIssue({
        id:             'poor_internal_linking',
        severity:       'low',
        category:       'structure',
        affectedPages:  poorly,
        impactScore:    3,
        description:    `${poorly.length} page(s) at depth > 1 have only ${threshold} or fewer inbound internal link(s). These pages receive minimal link equity and are likely to rank below their potential.`,
        recommendation: 'Increase internal links to these pages from relevant, higher-authority pages. Use contextual anchor text that includes the target keyword. Aim for at least 3–5 internal links to any page you want to rank.',
        autoFixable:    false,
      }),
    ];
  }
}

module.exports = InternalLinkingRule;
