'use strict';

const BaseRule = require('../BaseRule');

/**
 * RedirectChainRule — detects multi-hop redirect chains and redirect loops.
 *
 * Issues emitted (priority order — loop is more severe than chain):
 *
 *   redirect_loop  (critical)
 *     The redirect sequence contains the final URL — it cycles back to itself.
 *     Googlebot will abandon the chain after a fixed number of hops.
 *
 *   redirect_chain (medium)
 *     A URL redirects through 2+ intermediaries before landing.
 *     Each extra hop adds latency and dilutes PageRank passed through the chain.
 *     Chains of 1 hop (HTTP → HTTPS) are acceptable and not flagged.
 *
 * Data source: crawlResult.redirectChains — populated by CrawlEngine.
 */
class RedirectChainRule extends BaseRule {
  /** Chains with this many hops or more are flagged (1-hop HTTP→HTTPS is fine). */
  static MIN_HOPS_TO_FLAG = 2;

  evaluate({ redirectChains }) {
    if (!redirectChains || redirectChains.length === 0) return [];

    const loops  = redirectChains.filter((rc) => rc.isLoop);
    const chains = redirectChains.filter(
      (rc) => !rc.isLoop && rc.hops >= RedirectChainRule.MIN_HOPS_TO_FLAG
    );

    const issues = [];

    if (loops.length) {
      issues.push(this._buildIssue({
        id:             'redirect_loop',
        severity:       'critical',
        category:       'technical',
        affectedPages:  loops.map((rc) => rc.start),
        impactScore:    25,
        description:    `${loops.length} redirect loop(s) detected. The URL redirects back to itself (or to a URL earlier in the chain). Googlebot stops crawling after hitting a loop.`,
        recommendation: 'Inspect server-side redirect rules for circular references. Check .htaccess, nginx config, and CMS redirect rules. Loops commonly occur when HTTPS and www redirects are misconfigured simultaneously.',
        autoFixable:    false,
      }));
    }

    if (chains.length) {
      const maxHops   = Math.max(...chains.map((rc) => rc.hops));
      const startUrls = chains.map((rc) => rc.start);

      issues.push(this._buildIssue({
        id:             'redirect_chain',
        severity:       'medium',
        category:       'technical',
        affectedPages:  startUrls,
        impactScore:    8,
        description:    `${chains.length} URL(s) redirect through ${RedirectChainRule.MIN_HOPS_TO_FLAG}+ hops (max: ${maxHops} hops). Long chains add latency and dilute link equity passed to the final destination.`,
        recommendation: 'Update redirect rules so each URL points directly to its final destination. Combine HTTP→HTTPS and non-www→www redirects into a single rule where possible.',
        autoFixable:    false,
      }));
    }

    return issues;
  }
}

module.exports = RedirectChainRule;
