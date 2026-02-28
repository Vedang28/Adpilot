'use strict';

const BaseRule = require('../BaseRule');

/**
 * SitemapRule — detects the absence of /sitemap.xml.
 *
 * Issues emitted:
 *   no_sitemap (high) — /sitemap.xml returned a non-2xx response
 *
 * The sitemap.xml availability is determined out-of-band by CrawlEngine
 * (a lightweight HEAD request before BFS begins), stored in crawlStats.
 *
 * affectedPages: [baseUrl] — the issue is site-wide but we anchor it to the
 * root URL for UI display purposes.
 */
class SitemapRule extends BaseRule {
  evaluate({ baseUrl, crawlStats }) {
    if (crawlStats.hasSitemap) return [];

    return [
      this._buildIssue({
        id:             'no_sitemap',
        severity:       'high',
        category:       'technical',
        affectedPages:  [baseUrl],
        impactScore:    15,
        description:    'No sitemap.xml was found at /sitemap.xml. Sitemaps help search engines discover and prioritise pages efficiently, especially on larger sites.',
        recommendation: 'Create a sitemap.xml listing all canonical, indexable URLs and submit it to Google Search Console and Bing Webmaster Tools. Regenerate it automatically on content updates.',
        autoFixable:    true,
      }),
    ];
  }
}

module.exports = SitemapRule;
