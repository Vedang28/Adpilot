'use strict';

/**
 * seoMonitorProcessor — Bull processor for scheduled SEO re-audits.
 *
 * Job data: { monitorId }
 *
 * Pipeline:
 *   1. Load monitor + team
 *   2. Mark monitor as 'running'
 *   3. Create a SeoAudit record
 *   4. Run AuditOrchestrator (v2) or SeoAuditService (v1) inline
 *   5. Load previous audit for comparison
 *   6. Run RegressionDetector
 *   7. Run AlertEvaluator
 *   8. Send in-app notifications for high/critical alerts
 *   9. Record result via MonitoringEngine.recordResult()
 */

const prisma              = require('../../config/prisma');
const logger              = require('../../config/logger');
const featureFlags        = require('../../config/featureFlags');
const { createNotification } = require('../../services/notificationHelper');
const MonitoringEngine    = require('../../services/seo/monitoring/MonitoringEngine');
const RegressionDetector  = require('../../services/seo/monitoring/RegressionDetector');
const AlertEvaluator      = require('../../services/seo/monitoring/AlertEvaluator');

const { queues } = require('../index');

module.exports = async function seoMonitorProcessor(job) {
  const { monitorId, _sweep } = job.data;

  // ── Sweep mode: find all due monitors and enqueue individual jobs ──────────
  if (_sweep) {
    const dueMonitors = await MonitoringEngine.getDueMonitors();
    logger.info('SEO monitor sweep', { dueCount: dueMonitors.length });

    for (const monitor of dueMonitors) {
      await queues.seoMonitor.add(
        { monitorId: monitor.id },
        { jobId: `seo-monitor-${monitor.id}-${Date.now()}` }
      );
    }
    return { swept: dueMonitors.length };
  }

  if (!monitorId) {
    logger.error('seoMonitorProcessor: missing monitorId', { jobId: job.id });
    return;
  }

  // ── 1. Load monitor ────────────────────────────────────────────────────────
  const monitor = await prisma.seoMonitor.findUnique({
    where:   { id: monitorId },
    include: { team: { select: { id: true, plan: true } } },
  });

  if (!monitor) {
    logger.warn('seoMonitorProcessor: monitor not found', { monitorId });
    return;
  }

  if (monitor.status === 'paused') {
    logger.info('seoMonitorProcessor: monitor is paused, skipping', { monitorId });
    return;
  }

  const { teamId, url } = monitor;
  logger.info('SEO monitor run started', { monitorId, teamId, url, jobId: job.id });

  // ── 2. Mark monitor as running ────────────────────────────────────────────
  await prisma.seoMonitor.update({ where: { id: monitorId }, data: { status: 'running' } });

  // ── 3. Create SeoAudit record ─────────────────────────────────────────────
  const audit = await prisma.seoAudit.create({
    data: {
      teamId,
      url,
      status:        'pending',
      engineVersion: featureFlags.seoEngine.v2 ? 2 : 1,
    },
  });

  const auditId = audit.id;
  let score   = null;
  let grade   = null;
  let currAudit = null;

  try {
    // ── 4. Run the audit engine ──────────────────────────────────────────────
    const syntheticJob = {
      id:       `monitor-${monitorId}-${Date.now()}`,
      data:     { teamId, url, auditId },
      progress: async () => {},  // no-op progress reporting
    };

    if (featureFlags.seoEngine.v2) {
      const AuditOrchestrator = require('../../services/seo/audit/AuditOrchestrator');
      const result = await AuditOrchestrator.run(syntheticJob);
      score = result?.score ?? null;
      grade = result?.grade ?? null;
    } else {
      const SeoAuditService = require('../../services/seo/SeoAuditService');
      const result = await SeoAuditService.audit(teamId, url, auditId);
      score = result?.overallScore ?? null;
    }

    // ── 5. Load fresh audit record (with issues) ─────────────────────────────
    currAudit = await prisma.seoAudit.findUnique({ where: { id: auditId } });

    // ── 6. Load previous audit for comparison ────────────────────────────────
    let prevAudit = null;
    if (monitor.lastAuditId) {
      prevAudit = await prisma.seoAudit.findUnique({ where: { id: monitor.lastAuditId } });
    }

    // ── 7. Regression detection ───────────────────────────────────────────────
    const { regressions, improvements } = RegressionDetector.compare(prevAudit, currAudit);

    // ── 8. Alert evaluation ───────────────────────────────────────────────────
    const recentHistory = await prisma.scoreHistory.findMany({
      where:   { monitorId },
      orderBy: { recordedAt: 'desc' },
      take:    5,
    });

    const { alerts, highestSeverity } = AlertEvaluator.evaluate({
      currentScore:  score ?? 0,
      previousScore: monitor.lastScore,
      regressions,
      recentHistory,
    });

    logger.info('SEO monitor analysis complete', {
      monitorId,
      auditId,
      score,
      regressions:  regressions.length,
      improvements: improvements.length,
      alerts:       alerts.length,
      highestSeverity,
    });

    // ── 9. Notify team members for actionable alerts ──────────────────────────
    if (alerts.length > 0 && highestSeverity !== 'info') {
      const users = await prisma.user.findMany({
        where:  { teamId, isActive: true },
        select: { id: true },
      });

      const notifType = highestSeverity === 'critical' ? 'error'
                      : highestSeverity === 'high'     ? 'warning'
                      : 'info';

      const topAlert = alerts[0];

      for (const user of users) {
        createNotification(teamId, {
          userId:  user.id,
          message: `[SEO Monitor] ${monitor.name}: ${topAlert.message}`,
          type:    notifType,
        });
      }
    }

    // ── 10. Record result ──────────────────────────────────────────────────────
    await MonitoringEngine.recordResult(monitorId, {
      auditId,
      score:       score ?? 0,
      grade,
      regressions:  regressions.length,
      improvements: improvements.length,
      alerts,
    });

    logger.info('SEO monitor run completed', { monitorId, auditId, score });

    return { monitorId, auditId, score };

  } catch (err) {
    logger.error('SEO monitor run failed', {
      monitorId,
      auditId,
      error: err.message,
      stack: err.stack,
    });

    // Mark audit as failed
    try {
      await prisma.seoAudit.update({
        where: { id: auditId },
        data:  { status: 'failed' },
      });
    } catch { /* ignore */ }

    // Reset monitor so it will be rescheduled
    await MonitoringEngine.recordFailure(monitorId);

    throw err;
  }
};
