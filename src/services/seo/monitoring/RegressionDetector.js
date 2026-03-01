'use strict';

/**
 * RegressionDetector — compares two SEO audit results and classifies changes.
 *
 * A "fingerprint" uniquely identifies an issue instance:
 *   `${ruleId}::${affectedUrl ?? 'site-wide'}`
 *
 * Regressions = fingerprints in currentAudit that were NOT in previousAudit
 * Improvements = fingerprints in previousAudit that are NOT in currentAudit
 *
 * Both audits must have an `issues` array (v2 engine output).
 * Falls back to empty arrays gracefully for v1 / null audits.
 */

/**
 * Build a Set of fingerprints from an audit's issues array.
 * @param {object|null} audit
 * @returns {Map<string, object>}  fingerprint → issue object
 */
function buildFingerprintMap(audit) {
  const issues = Array.isArray(audit?.issues) ? audit.issues : [];
  const map = new Map();

  for (const issue of issues) {
    const pages = Array.isArray(issue.affectedPages) && issue.affectedPages.length > 0
      ? issue.affectedPages
      : [null];

    for (const page of pages) {
      const fp = `${issue.id ?? issue.ruleId ?? 'unknown'}::${page ?? 'site-wide'}`;
      map.set(fp, { ...issue, _affectedPage: page });
    }
  }

  return map;
}

const RegressionDetector = {
  /**
   * Compare two audit records and return classified changes.
   *
   * @param {object|null} prevAudit — previous SeoAudit record (may be null if first run)
   * @param {object}      currAudit — current  SeoAudit record
   * @returns {{ regressions: object[], improvements: object[], unchanged: number }}
   */
  compare(prevAudit, currAudit) {
    if (!currAudit) return { regressions: [], improvements: [], unchanged: 0 };

    const prevMap = buildFingerprintMap(prevAudit);
    const currMap = buildFingerprintMap(currAudit);

    const regressions  = [];
    const improvements = [];

    // Issues present in curr but NOT prev → regressions
    for (const [fp, issue] of currMap.entries()) {
      if (!prevMap.has(fp)) {
        regressions.push({
          fingerprint: fp,
          ruleId:      issue.id ?? issue.ruleId,
          description: issue.description,
          severity:    issue.severity ?? 'low',
          page:        issue._affectedPage,
          type:        'regression',
        });
      }
    }

    // Issues present in prev but NOT curr → improvements (fixed)
    for (const [fp, issue] of prevMap.entries()) {
      if (!currMap.has(fp)) {
        improvements.push({
          fingerprint: fp,
          ruleId:      issue.id ?? issue.ruleId,
          description: issue.description,
          severity:    issue.severity ?? 'low',
          page:        issue._affectedPage,
          type:        'improvement',
        });
      }
    }

    // Sort regressions: critical → high → medium → low
    const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
    regressions.sort((a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
    );

    const unchanged = Math.max(0, currMap.size - regressions.length);

    return { regressions, improvements, unchanged };
  },

  /**
   * Whether this comparison is the first run (no previous audit to compare).
   * @param {object|null} prevAudit
   * @returns {boolean}
   */
  isFirstRun(prevAudit) {
    return !prevAudit;
  },
};

module.exports = RegressionDetector;
