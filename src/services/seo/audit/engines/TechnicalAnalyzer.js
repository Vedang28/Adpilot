'use strict';

const logger      = require('../../../../config/logger');
const defaultRules = require('../rules/registry');

/**
 * Severity ranking for sort order (lower = more severe).
 * @type {Record<string, number>}
 */
const SEVERITY_ORDER = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
};

/**
 * TechnicalAnalyzer — runs all registered SEO rules against a CrawlResult.
 *
 * Responsibilities:
 *   1. Iterate every rule in the registry
 *   2. Call rule.evaluate(crawlResult) in a try/catch
 *   3. Accumulate all returned Issue[] arrays into a flat list
 *   4. Sort by severity (critical → high → medium → low)
 *   5. Return the sorted Issue[]
 *
 * Rules are isolated — one rule throwing never prevents the others from running.
 * A failed rule is logged at `warn` level and its issues are omitted from the
 * result (rather than crashing the entire audit).
 *
 * Instances are cheap to create; construct one per audit job, or reuse a single
 * instance if rules are stateless (they are, per BaseRule contract).
 */
class TechnicalAnalyzer {
  /**
   * @param {BaseRule[]} [rules] - Override the default registry (useful for tests).
   */
  constructor(rules = defaultRules) {
    if (!Array.isArray(rules) || rules.length === 0) {
      throw new TypeError('TechnicalAnalyzer: rules must be a non-empty array');
    }
    this._rules = rules;
  }

  /**
   * Run all rules and return a severity-sorted flat Issue[].
   *
   * @param {CrawlResult} crawlResult  - output from CrawlEngine.crawl()
   * @returns {Issue[]}
   */
  analyze(crawlResult) {
    if (!crawlResult || !Array.isArray(crawlResult.pages)) {
      throw new TypeError('TechnicalAnalyzer.analyze: crawlResult must have a pages array');
    }

    const allIssues = [];
    let   rulesFailed  = 0;
    let   rulesSkipped = 0;

    for (const rule of this._rules) {
      const ruleName = rule.constructor.name;

      // Guard: rule must implement evaluate()
      if (typeof rule.evaluate !== 'function') {
        logger.warn({ ruleName }, 'TechnicalAnalyzer: rule missing evaluate() — skipped');
        rulesSkipped++;
        continue;
      }

      try {
        const issues = rule.evaluate(crawlResult);

        // Validate return value — must be an array (empty = no issues)
        if (!Array.isArray(issues)) {
          logger.warn(
            { ruleName, returned: typeof issues },
            'TechnicalAnalyzer: rule returned non-array — skipped'
          );
          rulesSkipped++;
          continue;
        }

        for (const issue of issues) {
          allIssues.push(issue);
        }
      } catch (err) {
        rulesFailed++;
        logger.warn(
          { ruleName, err: err.message, stack: err.stack },
          'TechnicalAnalyzer: rule threw — skipping its issues'
        );
      }
    }

    if (rulesFailed > 0 || rulesSkipped > 0) {
      logger.warn(
        { rulesFailed, rulesSkipped, totalRules: this._rules.length },
        'TechnicalAnalyzer: some rules did not produce results'
      );
    }

    // Sort critical → high → medium → low; ties preserve insertion order (stable sort)
    allIssues.sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
    );

    logger.debug(
      {
        pagesAnalyzed:    crawlResult.pages.length,
        issuesFound:      allIssues.length,
        rulesRun:         this._rules.length - rulesSkipped,
        rulesFailed,
        rulesSkipped,
        bySeverity: {
          critical: allIssues.filter((i) => i.severity === 'critical').length,
          high:     allIssues.filter((i) => i.severity === 'high').length,
          medium:   allIssues.filter((i) => i.severity === 'medium').length,
          low:      allIssues.filter((i) => i.severity === 'low').length,
        },
      },
      'TechnicalAnalyzer: analysis complete'
    );

    return allIssues;
  }

  /**
   * Convenience: list the names of all registered rules.
   * Useful for health-check / debug endpoints.
   *
   * @returns {string[]}
   */
  get ruleNames() {
    return this._rules.map((r) => r.constructor.name);
  }
}

module.exports = TechnicalAnalyzer;
