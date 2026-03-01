'use strict';

/**
 * AlertEvaluator — evaluates a set of priority-ordered alert rules after each monitor run.
 *
 * Alert types (in evaluation priority order):
 *   1. score_crash        — score dropped >= 15 pts since last run   [severity: critical]
 *   2. score_drop         — score dropped >= 5 pts since last run    [severity: high]
 *   3. critical_regression— new critical-severity issue appeared     [severity: critical]
 *   4. security_regression— new issue with 'security' in its ruleId [severity: high]
 *   5. downward_trend     — last 3 consecutive runs all declined     [severity: medium]
 *   6. score_improvement  — score improved >= 10 pts (positive)      [severity: info]
 */

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

const AlertEvaluator = {
  /**
   * @param {object} opts
   * @param {number}   opts.currentScore
   * @param {number|null} opts.previousScore   — null on first run
   * @param {object[]} opts.regressions        — from RegressionDetector
   * @param {object[]} opts.recentHistory      — last N ScoreHistory entries (most-recent first)
   * @returns {{ alerts: object[], highestSeverity: string|null }}
   */
  evaluate({ currentScore, previousScore, regressions = [], recentHistory = [] }) {
    const alerts = [];

    const scoreDelta = previousScore != null ? currentScore - previousScore : null;

    // ── Rule 1: score_crash ────────────────────────────────────────────────
    if (scoreDelta !== null && scoreDelta <= -15) {
      alerts.push({
        type:     'score_crash',
        severity: 'critical',
        message:  `Score crashed by ${Math.abs(scoreDelta)} points (${previousScore} → ${currentScore})`,
        delta:    scoreDelta,
      });
    }

    // ── Rule 2: score_drop (only if not already flagged as crash) ──────────
    else if (scoreDelta !== null && scoreDelta <= -5) {
      alerts.push({
        type:     'score_drop',
        severity: 'high',
        message:  `Score dropped by ${Math.abs(scoreDelta)} points (${previousScore} → ${currentScore})`,
        delta:    scoreDelta,
      });
    }

    // ── Rule 3: critical_regression ───────────────────────────────────────
    const criticalRegressions = regressions.filter((r) => r.severity === 'critical');
    if (criticalRegressions.length > 0) {
      alerts.push({
        type:     'critical_regression',
        severity: 'critical',
        message:  `${criticalRegressions.length} new critical issue(s) detected`,
        issues:   criticalRegressions.slice(0, 5).map((r) => r.description),
      });
    }

    // ── Rule 4: security_regression ───────────────────────────────────────
    const securityRegressions = regressions.filter((r) =>
      (r.ruleId ?? '').toLowerCase().includes('security') ||
      (r.description ?? '').toLowerCase().includes('https') ||
      (r.description ?? '').toLowerCase().includes('mixed content')
    );
    if (securityRegressions.length > 0) {
      alerts.push({
        type:     'security_regression',
        severity: 'high',
        message:  `${securityRegressions.length} new security-related issue(s) detected`,
        issues:   securityRegressions.slice(0, 3).map((r) => r.description),
      });
    }

    // ── Rule 5: downward_trend ────────────────────────────────────────────
    // Need at least 3 prior data points
    if (recentHistory.length >= 3) {
      const last3 = recentHistory.slice(0, 3);  // most-recent first
      const isDownwardTrend = last3[0].score < last3[1].score && last3[1].score < last3[2].score;
      if (isDownwardTrend) {
        const totalDrop = last3[2].score - last3[0].score;
        alerts.push({
          type:     'downward_trend',
          severity: 'medium',
          message:  `Scores have declined for 3 consecutive runs (−${totalDrop} pts total)`,
          scores:   last3.map((h) => h.score).reverse(),
        });
      }
    }

    // ── Rule 6: score_improvement ─────────────────────────────────────────
    if (scoreDelta !== null && scoreDelta >= 10) {
      alerts.push({
        type:     'score_improvement',
        severity: 'info',
        message:  `Score improved by ${scoreDelta} points (${previousScore} → ${currentScore})`,
        delta:    scoreDelta,
      });
    }

    // Determine highest severity
    let highestSeverity = null;
    for (const alert of alerts) {
      if (highestSeverity === null || SEVERITY_RANK[alert.severity] < SEVERITY_RANK[highestSeverity]) {
        highestSeverity = alert.severity;
      }
    }

    return { alerts, highestSeverity };
  },
};

module.exports = AlertEvaluator;
