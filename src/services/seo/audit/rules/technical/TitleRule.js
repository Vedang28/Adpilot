'use strict';

const BaseRule   = require('../BaseRule');
const SEO_CONFIG = require('../../../../../config/seo');

/**
 * TitleRule — detects three title-tag issues in one pass over the page list.
 *
 * Issues emitted:
 *   missing_title     (critical) — <title> tag absent
 *   title_too_short   (medium)   — title < config.content.title.minLength chars
 *   title_too_long    (low)      — title > config.content.title.maxLength chars
 */
class TitleRule extends BaseRule {
  evaluate({ pages }) {
    const live = this._livePages(pages);

    const missing   = [];
    const tooShort  = [];
    const tooLong   = [];

    const { minLength, maxLength } = SEO_CONFIG.content.title;

    for (const page of live) {
      if (!page.title) {
        missing.push(page.url);
      } else if (page.titleLength < minLength) {
        tooShort.push(page.url);
      } else if (page.titleLength > maxLength) {
        tooLong.push(page.url);
      }
    }

    const issues = [];

    if (missing.length) {
      issues.push(this._buildIssue({
        id:             'missing_title',
        severity:       'critical',
        category:       'technical',
        affectedPages:  missing,
        impactScore:    25,
        description:    `${missing.length} page(s) have no <title> tag. Search engines use the title as the primary label in SERPs.`,
        recommendation: 'Add a unique, descriptive <title> tag (30–60 characters) to every page. Include the primary keyword near the front.',
        autoFixable:    false,
      }));
    }

    if (tooShort.length) {
      issues.push(this._buildIssue({
        id:             'title_too_short',
        severity:       'medium',
        category:       'technical',
        affectedPages:  tooShort,
        impactScore:    8,
        description:    `${tooShort.length} page(s) have a title shorter than ${minLength} characters. Short titles waste SERP real estate and reduce CTR.`,
        recommendation: `Expand titles to at least ${minLength} characters. Use the format "Primary Keyword | Brand" or "Action + Benefit | Brand".`,
        autoFixable:    false,
      }));
    }

    if (tooLong.length) {
      issues.push(this._buildIssue({
        id:             'title_too_long',
        severity:       'low',
        category:       'technical',
        affectedPages:  tooLong,
        impactScore:    3,
        description:    `${tooLong.length} page(s) have a title longer than ${maxLength} characters. Google truncates long titles in SERPs.`,
        recommendation: `Shorten titles to ${maxLength} characters or fewer. Ensure the most important keywords appear before the cut-off point.`,
        autoFixable:    false,
      }));
    }

    return issues;
  }
}

module.exports = TitleRule;
