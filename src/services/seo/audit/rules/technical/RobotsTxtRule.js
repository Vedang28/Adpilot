'use strict';

const BaseRule = require('../BaseRule');

/**
 * RobotsTxtRule — detects robots.txt problems.
 *
 * Issues emitted (evaluated in priority order):
 *
 *   robots_blocks_crawl (critical)
 *     /robots.txt exists but contains `Disallow: /` — the entire site is
 *     blocked from crawling.  This is frequently an accidental staging config
 *     that was promoted to production.
 *
 *   no_robots_txt (medium)
 *     /robots.txt is missing.  Not as critical as blocking, but missing
 *     robots.txt means there is no crawl-budget guidance for bots.
 */
class RobotsTxtRule extends BaseRule {
  evaluate({ baseUrl, crawlStats }) {
    const issues = [];

    // robots_blocks_crawl is a superset of no_robots_txt (file exists + blocks)
    // Check it first so both issues don't fire simultaneously for the same site.
    if (crawlStats.robotsBlocksCrawl) {
      issues.push(this._buildIssue({
        id:             'robots_blocks_crawl',
        severity:       'critical',
        category:       'technical',
        affectedPages:  [baseUrl],
        impactScore:    25,
        description:    'The /robots.txt file contains "Disallow: /" which blocks all search engine crawlers from the entire site. This will prevent indexing.',
        recommendation: 'Review your robots.txt immediately. If the site should be indexable, remove or narrow the Disallow directive. This is a common production accident when staging configuration is deployed.',
        autoFixable:    false,
      }));

    } else if (!crawlStats.hasRobots) {
      issues.push(this._buildIssue({
        id:             'no_robots_txt',
        severity:       'medium',
        category:       'technical',
        affectedPages:  [baseUrl],
        impactScore:    8,
        description:    'No /robots.txt file was found. Without it, bots have no crawl-budget guidance and may waste resources on low-value pages.',
        recommendation: 'Create a /robots.txt file. At minimum include: User-agent: * / Allow: / and a Sitemap: directive pointing to your sitemap.xml.',
        autoFixable:    true,
      }));
    }

    return issues;
  }
}

module.exports = RobotsTxtRule;
