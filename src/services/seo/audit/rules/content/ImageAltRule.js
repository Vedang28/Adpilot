'use strict';

const BaseRule = require('../BaseRule');

/**
 * ImageAltRule — detects images missing descriptive alt text.
 *
 * Issues emitted:
 *   images_missing_alt (medium)
 *
 * Both `<img>` with no alt attribute and `<img alt="">` (empty string) are
 * flagged — an empty alt is only valid for decorative images that should be
 * invisible to screen readers and are not content-relevant.
 *
 * The issue description includes the total missing-alt count across all
 * affected pages so the team can gauge the remediation effort.
 */
class ImageAltRule extends BaseRule {
  evaluate({ pages }) {
    const live = this._livePages(pages);

    const affected    = [];
    let   totalMissing = 0;

    for (const page of live) {
      if (page.imagesMissingAlt > 0) {
        affected.push(page.url);
        totalMissing += page.imagesMissingAlt;
      }
    }

    if (!affected.length) return [];

    return [
      this._buildIssue({
        id:             'images_missing_alt',
        severity:       'medium',
        category:       'content',
        affectedPages:  affected,
        impactScore:    8,
        description:    `${totalMissing} image(s) across ${affected.length} page(s) are missing alt text. Alt attributes are used by screen readers for accessibility and by search engines to understand image content.`,
        recommendation: 'Add descriptive alt text to every content image. Be specific ("Red running shoes on a track") not generic ("image" or "photo"). For purely decorative images, use alt="".',
        autoFixable:    false,
      }),
    ];
  }
}

module.exports = ImageAltRule;
