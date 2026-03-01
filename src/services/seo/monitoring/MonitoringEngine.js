'use strict';

const prisma  = require('../../../config/prisma');
const logger  = require('../../../config/logger');
const AppError = require('../../../common/AppError');

const SCHEDULE_INTERVALS = {
  daily:  24 * 60 * 60 * 1_000,
  weekly: 7  * 24 * 60 * 60 * 1_000,
};

/**
 * Compute the next run timestamp from now given a schedule string.
 * @param {string} schedule — 'daily' | 'weekly'
 * @returns {Date}
 */
function nextRunDate(schedule) {
  const interval = SCHEDULE_INTERVALS[schedule] ?? SCHEDULE_INTERVALS.weekly;
  return new Date(Date.now() + interval);
}

const MonitoringEngine = {

  /**
   * Create (or update URL→schedule) a monitor for a team.
   * Enforces plan-based maxMonitors limit.
   *
   * @param {string} teamId
   * @param {{ url:string, name:string, schedule?:string }} opts
   * @returns {Promise<SeoMonitor>}
   */
  async scheduleMonitor(teamId, { url, name, schedule = 'weekly' }) {
    if (!url || !name) throw AppError.badRequest('url and name are required');
    if (!['daily', 'weekly'].includes(schedule)) {
      throw AppError.badRequest('schedule must be "daily" or "weekly"');
    }

    // Enforce plan limits
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { plan: true } });
    if (!team) throw AppError.notFound('Team not found');

    const LIMITS = require('../../../config/limits');
    const planLimits = LIMITS[team.plan] ?? LIMITS.starter;
    const maxMonitors = planLimits.maxMonitors ?? 1;

    const existing = await prisma.seoMonitor.count({ where: { teamId } });
    if (existing >= maxMonitors) {
      throw AppError.conflict(`Your plan allows up to ${maxMonitors} monitor(s). Upgrade to add more.`);
    }

    const monitor = await prisma.seoMonitor.create({
      data: {
        teamId,
        url:       url.trim(),
        name:      name.trim(),
        schedule,
        status:    'active',
        nextRunAt: nextRunDate(schedule),
      },
    });

    logger.info('SEO monitor created', { monitorId: monitor.id, url, schedule });
    return monitor;
  },

  /**
   * Get all monitors with their latest ScoreHistory entry for the dashboard.
   * @param {string} teamId
   * @returns {Promise<object[]>}
   */
  async getMonitorDashboard(teamId) {
    const monitors = await prisma.seoMonitor.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      include: {
        scoreHistory: {
          orderBy: { recordedAt: 'desc' },
          take: 7,   // last 7 data points for sparkline
        },
      },
    });

    return monitors.map((m) => {
      const history = m.scoreHistory.slice().reverse(); // chronological
      const latest  = m.scoreHistory[0] ?? null;        // most recent
      const prev    = m.scoreHistory[1] ?? null;

      const scoreDelta = (latest && prev)
        ? latest.score - prev.score
        : null;

      return {
        id:          m.id,
        url:         m.url,
        name:        m.name,
        status:      m.status,
        schedule:    m.schedule,
        lastScore:   m.lastScore,
        lastGrade:   m.lastGrade,
        nextRunAt:   m.nextRunAt,
        updatedAt:   m.updatedAt,
        scoreDelta,
        sparkline:   history.map((h) => ({ score: h.score, recordedAt: h.recordedAt })),
        latestAlerts: latest ? (latest.alerts ?? []) : [],
      };
    });
  },

  /**
   * Get score history for a single monitor (for the detail panel chart).
   * @param {string} monitorId
   * @param {string} teamId
   * @param {number} [limit=30]
   * @returns {Promise<object[]>}
   */
  async getMonitorTimeline(monitorId, teamId, limit = 30) {
    const monitor = await prisma.seoMonitor.findFirst({
      where: { id: monitorId, teamId },
    });
    if (!monitor) throw AppError.notFound('Monitor not found');

    const history = await prisma.scoreHistory.findMany({
      where:   { monitorId },
      orderBy: { recordedAt: 'asc' },
      take:    limit,
    });

    return { monitor, history };
  },

  /**
   * Pause a monitor — stops scheduling new audit runs.
   */
  async pauseMonitor(monitorId, teamId) {
    const monitor = await prisma.seoMonitor.findFirst({ where: { id: monitorId, teamId } });
    if (!monitor) throw AppError.notFound('Monitor not found');
    if (monitor.status === 'running') throw AppError.conflict('Cannot pause a monitor that is currently running');

    return prisma.seoMonitor.update({
      where: { id: monitorId },
      data:  { status: 'paused', nextRunAt: null },
    });
  },

  /**
   * Resume a paused monitor — recalculates nextRunAt.
   */
  async resumeMonitor(monitorId, teamId) {
    const monitor = await prisma.seoMonitor.findFirst({ where: { id: monitorId, teamId } });
    if (!monitor) throw AppError.notFound('Monitor not found');

    return prisma.seoMonitor.update({
      where: { id: monitorId },
      data:  { status: 'active', nextRunAt: nextRunDate(monitor.schedule) },
    });
  },

  /**
   * Delete a monitor and all its score history (cascade).
   */
  async deleteMonitor(monitorId, teamId) {
    const monitor = await prisma.seoMonitor.findFirst({ where: { id: monitorId, teamId } });
    if (!monitor) throw AppError.notFound('Monitor not found');

    await prisma.seoMonitor.delete({ where: { id: monitorId } });
    logger.info('SEO monitor deleted', { monitorId });
  },

  /**
   * Update monitor name or schedule.
   */
  async updateMonitor(monitorId, teamId, { name, schedule }) {
    const monitor = await prisma.seoMonitor.findFirst({ where: { id: monitorId, teamId } });
    if (!monitor) throw AppError.notFound('Monitor not found');

    const data = {};
    if (name) data.name = name.trim();
    if (schedule) {
      if (!['daily', 'weekly'].includes(schedule)) throw AppError.badRequest('Invalid schedule');
      data.schedule  = schedule;
      data.nextRunAt = nextRunDate(schedule);
    }

    return prisma.seoMonitor.update({ where: { id: monitorId }, data });
  },

  /**
   * Fetch all monitors due for a run (status=active, nextRunAt <= now).
   * Called by the recurring job scheduler.
   * @returns {Promise<SeoMonitor[]>}
   */
  async getDueMonitors() {
    return prisma.seoMonitor.findMany({
      where: {
        status:    'active',
        nextRunAt: { lte: new Date() },
      },
    });
  },

  /**
   * Called by the seoMonitorProcessor after a successful audit run.
   * Records the score history, updates the monitor's lastScore/lastAuditId/nextRunAt.
   *
   * @param {string} monitorId
   * @param {{ auditId:string, score:number, grade:string, regressions:number, improvements:number, alerts:object[] }} result
   */
  async recordResult(monitorId, { auditId, score, grade, regressions = 0, improvements = 0, alerts = [] }) {
    await prisma.scoreHistory.create({
      data: {
        monitorId,
        auditId,
        score,
        grade,
        regressions,
        improvements,
        alerts,
      },
    });

    const monitor = await prisma.seoMonitor.findUnique({ where: { id: monitorId } });

    await prisma.seoMonitor.update({
      where: { id: monitorId },
      data: {
        lastAuditId: auditId,
        lastScore:   score,
        lastGrade:   grade ?? null,
        status:      'active',
        nextRunAt:   nextRunDate(monitor?.schedule ?? 'weekly'),
      },
    });

    logger.info('SEO monitor result recorded', { monitorId, auditId, score, regressions, improvements });
  },

  /**
   * Mark a monitor as failed after a crashed audit run.
   * Resets to active so it will be re-tried on next schedule cycle.
   */
  async recordFailure(monitorId) {
    const monitor = await prisma.seoMonitor.findUnique({ where: { id: monitorId } });
    await prisma.seoMonitor.update({
      where: { id: monitorId },
      data: {
        status:   'active',
        nextRunAt: nextRunDate(monitor?.schedule ?? 'weekly'),
      },
    });
  },
};

module.exports = MonitoringEngine;
