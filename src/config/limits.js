'use strict';

/**
 * Plan-based feature limits for the SEO Audit Engine.
 *
 * AuditOrchestrator reads these at job-execution time (not request time) so
 * limits always reflect the team's current plan even if it changed between
 * when the audit was queued and when the Bull worker picks it up.
 *
 * Usage:
 *   const limits = require('../config/limits');
 *   const planLimits = limits[team.plan] || limits.starter;
 */
module.exports = {

  starter: {
    /** Max concurrent SEO audits a team may have running simultaneously. */
    maxConcurrentAudits:  1,

    /** Max audits that can be queued or running per team at any moment. */
    maxQueuedAudits:      2,

    /** Absolute cap on pages crawled per audit run. */
    maxPagesPerAudit:     50,

    /** Number of top internal pages to run Lighthouse against. */
    lighthousePagesLimit: 3,

    /** Whether the LLM executive summary is generated for this plan. */
    summaryEnabled:       false,

    /** Max SEO monitors (recurring audit schedules). */
    maxMonitors:          1,
  },

  pro: {
    maxConcurrentAudits:  2,
    maxQueuedAudits:      5,
    maxPagesPerAudit:     200,
    lighthousePagesLimit: 5,
    summaryEnabled:       true,
    maxMonitors:          5,
  },

  business: {
    maxConcurrentAudits:  5,
    maxQueuedAudits:      20,
    maxPagesPerAudit:     1_000,
    lighthousePagesLimit: 10,
    summaryEnabled:       true,
    maxMonitors:          20,
  },
};
