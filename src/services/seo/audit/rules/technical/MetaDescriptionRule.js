'use strict';

const BaseRule   = require('../BaseRule');
const SEO_CONFIG = require('../../../../../config/seo');

/**
 * MetaDescriptionRule — detects three meta-description issues.
 *
 * Issues emitted:
 *   missing_meta_description       (high)   — no <meta name="description">
 *   meta_description_too_short     (low)    — description < minLength chars
 *   meta_description_too_long      (low)    — description > maxLength chars
 */
class MetaDescriptionRule extends BaseRule {
  evaluate({ pages }) {
    const live = this._livePages(pages);

    const missing  = [];
    const tooShort = [];
    const tooLong  = [];

    const { minLength, maxLength } = SEO_CONFIG.content.metaDescription;

    for (const page of live) {
      if (!page.metaDescription) {
        missing.push(page.url);
      } else if (page.metaDescLength < minLength) {
        tooShort.push(page.url);
      } else if (page.metaDescLength > maxLength) {
        tooLong.push(page.url);
      }
    }

    const issues = [];

    if (missing.length) {
      issues.push(this._buildIssue({
        id:             'missing_meta_description',
        severity:       'high',
        category:       'technical',
        affectedPages:  missing,
        impactScore:    15,
        description:    `${missing.length} page(s) are missing a meta description. While not a direct ranking factor, meta descriptions heavily influence click-through rates.`,
        recommendation: `Write a compelling meta description (${minLength}–${maxLength} characters) for every page. Include the primary keyword and a clear call-to-action.`,
        autoFixable:    false,
      }));
    }

    if (tooShort.length) {
      issues.push(this._buildIssue({
        id:             'meta_description_too_short',
        severity:       'low',
        category:       'technical',
        affectedPages:  tooShort,
        impactScore:    3,
        description:    `${tooShort.length} page(s) have a meta description shorter than ${minLength} characters. Thin descriptions miss the opportunity to entice clicks.`,
        recommendation: `Expand meta descriptions to ${minLength}–${maxLength} characters. Summarise the page value and include a keyword naturally.`,
        autoFixable:    false,
      }));
    }

    if (tooLong.length) {
      issues.push(this._buildIssue({
        id:             'meta_description_too_long',
        severity:       'low',
        category:       'technical',
        affectedPages:  tooLong,
        impactScore:    3,
        description:    `${tooLong.length} page(s) have a meta description longer than ${maxLength} characters. Google will truncate it in SERPs.`,
        recommendation: `Shorten meta descriptions to ${maxLength} characters or fewer. Front-load the most important information.`,
        autoFixable:    false,
      }));
    }

    return issues;
  }
}

module.exports = MetaDescriptionRule;
