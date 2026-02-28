'use strict';

const BaseRule   = require('../BaseRule');
const SEO_CONFIG = require('../../../../../config/seo');

/**
 * WordCountRule — detects thin content pages.
 *
 * Issues emitted:
 *   thin_content (medium)
 *
 * Thin content is defined as a live page with fewer than config.content.minWordCount
 * words in the rendered body text (scripts, styles, nav and footer are stripped
 * by PuppeteerAdapter before the word count is computed).
 *
 * Pages excluded from this check:
 *   - Failed / non-2xx pages (not real content)
 *   - Pages with wordCount === 0 AND title is null (likely 404 pages that
 *     Puppeteer fetched but returned an error shell)
 *   - Seed URL not excluded — even the homepage can be thin content
 */
class WordCountRule extends BaseRule {
  evaluate({ pages }) {
    const live = this._livePages(pages);
    const min  = SEO_CONFIG.content.minWordCount;

    // A word count of exactly 0 on a live page usually means the page is a
    // redirect target or a non-HTML resource — skip those edge cases.
    const thin = live
      .filter((p) => p.wordCount > 0 && p.wordCount < min)
      .map((p) => p.url);

    if (!thin.length) return [];

    return [
      this._buildIssue({
        id:             'thin_content',
        severity:       'medium',
        category:       'content',
        affectedPages:  thin,
        impactScore:    8,
        description:    `${thin.length} page(s) have fewer than ${min} words. Thin content pages are less likely to rank and may be seen as low-quality by Google's Helpful Content system.`,
        recommendation: `Expand page content to at least ${min} words. Add genuinely useful text: explanations, examples, FAQs, or supporting data. Avoid padding — quality beats quantity.`,
        autoFixable:    false,
      }),
    ];
  }
}

module.exports = WordCountRule;
