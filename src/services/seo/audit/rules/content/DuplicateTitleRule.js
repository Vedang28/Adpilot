'use strict';

const BaseRule = require('../BaseRule');

/**
 * DuplicateTitleRule — detects pages sharing the same <title> tag.
 *
 * Issues emitted:
 *   duplicate_title (high)
 *
 * Algorithm:
 *   1. Index live pages by their title (lowercased for comparison, case-insensitive)
 *   2. Find all groups with 2+ pages sharing the same title
 *   3. affectedPages = union of all pages in duplicate groups
 *
 * Why high severity: duplicate titles are one of the most common causes of
 * keyword cannibalisation — search engines don't know which page to rank for
 * the target query and may choose the wrong one.
 *
 * Pages with no title are excluded — missing_title (critical) already covers them.
 */
class DuplicateTitleRule extends BaseRule {
  evaluate({ pages }) {
    const live = this._livePages(pages);

    // titleKey → URL[]
    const titleGroups = new Map();

    for (const page of live) {
      if (!page.title) continue; // missing_title handles this case

      const key = page.title.toLowerCase().trim();
      if (!titleGroups.has(key)) titleGroups.set(key, []);
      titleGroups.get(key).push(page.url);
    }

    const affected = [];
    let duplicateGroupCount = 0;

    for (const [, urls] of titleGroups) {
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
        id:             'duplicate_title',
        severity:       'high',
        category:       'content',
        affectedPages:  affected,
        impactScore:    15,
        description:    `${affected.length} page(s) share duplicate <title> tags across ${duplicateGroupCount} title group(s). Duplicate titles cause keyword cannibalisation and make it harder for search engines to assign authority to the right page.`,
        recommendation: 'Ensure every page has a unique, descriptive title. Use a consistent title formula that incorporates the page\'s specific keyword and differentiates it from similar pages (e.g., "Running Shoes | Nike" vs "Running Shoes for Men | Nike").',
        autoFixable:    false,
      }),
    ];
  }
}

module.exports = DuplicateTitleRule;
