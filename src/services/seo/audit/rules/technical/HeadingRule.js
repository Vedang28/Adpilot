'use strict';

const BaseRule = require('../BaseRule');

/**
 * HeadingRule — detects H1 structural issues.
 *
 * Issues emitted:
 *   missing_h1   (critical) — no H1 on page; Googlebot uses H1 to understand topic
 *   multiple_h1  (medium)   — more than one H1; dilutes topical focus
 */
class HeadingRule extends BaseRule {
  evaluate({ pages }) {
    const live = this._livePages(pages);

    const missing  = [];
    const multiple = [];

    for (const page of live) {
      if (page.h1Count === 0) {
        missing.push(page.url);
      } else if (page.h1Count > 1) {
        multiple.push(page.url);
      }
    }

    const issues = [];

    if (missing.length) {
      issues.push(this._buildIssue({
        id:             'missing_h1',
        severity:       'critical',
        category:       'technical',
        affectedPages:  missing,
        impactScore:    25,
        description:    `${missing.length} page(s) have no H1 tag. The H1 is the primary signal to search engines about a page's topic.`,
        recommendation: 'Add exactly one H1 per page. It should contain the primary keyword and clearly describe the page content.',
        autoFixable:    false,
      }));
    }

    if (multiple.length) {
      issues.push(this._buildIssue({
        id:             'multiple_h1',
        severity:       'medium',
        category:       'technical',
        affectedPages:  multiple,
        impactScore:    8,
        description:    `${multiple.length} page(s) have more than one H1 tag. Multiple H1s dilute topical focus and create ambiguity for crawlers.`,
        recommendation: 'Retain only one H1 per page. Downgrade additional H1s to H2 or H3 to reflect the correct heading hierarchy.',
        autoFixable:    false,
      }));
    }

    return issues;
  }
}

module.exports = HeadingRule;
