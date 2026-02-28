'use strict';

const BaseRule = require('../BaseRule');

/**
 * DuplicateMetaRule — detects pages sharing identical meta descriptions.
 *
 * Issues emitted:
 *   duplicate_meta_description (medium)
 *
 * Algorithm mirrors DuplicateTitleRule:
 *   Index by lowercased meta description, flag groups with 2+ pages.
 *
 * Severity is medium rather than high because meta descriptions are not a
 * direct ranking factor — but duplicate descriptions reduce CTR diversity
 * across pages and indicate a templating problem worth fixing.
 *
 * Pages with no meta description are excluded — missing_meta_description
 * already covers that case.
 */
class DuplicateMetaRule extends BaseRule {
  evaluate({ pages }) {
    const live = this._livePages(pages);

    // metaKey → URL[]
    const metaGroups = new Map();

    for (const page of live) {
      if (!page.metaDescription) continue; // missing_meta_description handles this

      const key = page.metaDescription.toLowerCase().trim();
      if (!metaGroups.has(key)) metaGroups.set(key, []);
      metaGroups.get(key).push(page.url);
    }

    const affected = [];
    let duplicateGroupCount = 0;

    for (const [, urls] of metaGroups) {
      if (urls.length >= 2) {
        duplicateGroupCount++;
        for (const url of urls) {
          if (!affected.includes(url)) affected.push(url);
        }
      }
    }

    if (!affected.length) return [];

    return [
      this._buildIssue({
        id:             'duplicate_meta_description',
        severity:       'medium',
        category:       'content',
        affectedPages:  affected,
        impactScore:    8,
        description:    `${affected.length} page(s) share duplicate meta descriptions across ${duplicateGroupCount} group(s). This often indicates a CMS template is using a default or global description instead of unique ones per page.`,
        recommendation: 'Write a unique meta description for every page (120–160 chars). Automate this in your CMS using page-specific fields (first paragraph, custom excerpt, etc.) rather than a single site-wide default.',
        autoFixable:    false,
      }),
    ];
  }
}

module.exports = DuplicateMetaRule;
