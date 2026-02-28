'use strict';

/**
 * BaseRule — abstract base for all SEO issue detectors.
 *
 * Every rule:
 *   - Implements evaluate(crawlResult) → Issue[]
 *   - Returns an empty array when no issue is found (never null)
 *   - Is a pure function: no I/O, no side effects, deterministic
 *   - Uses _buildIssue() to construct well-formed Issue objects
 *
 * A single rule file may emit multiple distinct issue IDs.
 * For example, TitleRule checks missing_title, title_too_short, title_too_long —
 * all are title-related and share the same detection pass over the page list.
 *
 * Issue shape:
 * {
 *   id:             string,   // unique snake_case identifier
 *   ruleId:         string,   // same as id (for cross-reference)
 *   severity:       'critical' | 'high' | 'medium' | 'low',
 *   category:       'technical' | 'content' | 'structure',
 *   affectedPages:  string[],  // URLs where the issue was detected
 *   affectedCount:  number,    // affectedPages.length — pre-computed for scoring
 *   impactScore:    number,    // 0-100 fixed per rule ID
 *   description:    string,    // human-readable explanation of the problem
 *   recommendation: string,    // actionable fix
 *   autoFixable:    boolean,   // can a tool fix this without human decisions?
 * }
 */
class BaseRule {
  /**
   * Analyse the full CrawlResult and return all issues this rule detected.
   *
   * MUST return Issue[] (empty array = no problem found).
   * MUST NOT throw — catch exceptions internally and return [].
   * MUST NOT perform I/O.
   *
   * @param {CrawlResult} crawlResult
   * @returns {Issue[]}
   */
  // eslint-disable-next-line no-unused-vars
  evaluate(crawlResult) {
    throw new Error(`${this.constructor.name} must implement evaluate(crawlResult)`);
  }

  /**
   * Construct a well-formed Issue object.
   *
   * @param {object} params
   * @param {string}   params.id
   * @param {'critical'|'high'|'medium'|'low'} params.severity
   * @param {'technical'|'content'|'structure'} params.category
   * @param {string[]} params.affectedPages
   * @param {number}   params.impactScore    - fixed 0-100 per rule
   * @param {string}   params.description
   * @param {string}   params.recommendation
   * @param {boolean}  [params.autoFixable]  - default false
   * @returns {Issue}
   */
  _buildIssue({
    id,
    severity,
    category,
    affectedPages,
    impactScore,
    description,
    recommendation,
    autoFixable = false,
  }) {
    return {
      id,
      ruleId:        id,
      severity,
      category,
      affectedPages: affectedPages ?? [],
      affectedCount: (affectedPages ?? []).length,
      impactScore,
      description,
      recommendation,
      autoFixable,
    };
  }

  /**
   * Filter helper: returns crawled pages that are live (not failed, 2xx status).
   * Most per-page rules should operate only on live pages.
   *
   * @param {PageData[]} pages
   * @returns {PageData[]}
   */
  _livePages(pages) {
    return pages.filter((p) => !p.failed && p.statusCode >= 200 && p.statusCode < 400);
  }
}

module.exports = BaseRule;
