'use strict';

const { respond }      = require('../common/response');
const AppError         = require('../common/AppError');
const MonitoringEngine = require('../services/seo/monitoring/MonitoringEngine');
const { queues }       = require('../queues');
const logger           = require('../config/logger');

/**
 * GET /api/v1/seo/monitors
 * List all monitors with dashboard data (sparkline, score delta, latest alerts).
 */
async function listMonitors(req, res, next) {
  try {
    const { teamId } = req.user;
    const data = await MonitoringEngine.getMonitorDashboard(teamId);
    return respond(res, 200, data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/seo/monitors
 * Create a new monitor.
 * Body: { url, name, schedule }
 */
async function createMonitor(req, res, next) {
  try {
    const { teamId } = req.user;
    const { url, name, schedule } = req.body;

    if (!url || !name) {
      throw AppError.badRequest('url and name are required');
    }

    const monitor = await MonitoringEngine.scheduleMonitor(teamId, { url, name, schedule });
    return respond(res, 201, monitor);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/seo/monitors/:id
 * Update monitor name or schedule.
 * Body: { name?, schedule? }
 */
async function updateMonitor(req, res, next) {
  try {
    const { teamId } = req.user;
    const { id }     = req.params;
    const { name, schedule } = req.body;

    const monitor = await MonitoringEngine.updateMonitor(id, teamId, { name, schedule });
    return respond(res, 200, monitor);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/seo/monitors/:id
 * Delete a monitor and its score history.
 */
async function deleteMonitor(req, res, next) {
  try {
    const { teamId } = req.user;
    const { id }     = req.params;

    await MonitoringEngine.deleteMonitor(id, teamId);
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/seo/monitors/:id/pause
 * Pause a monitor.
 */
async function pauseMonitor(req, res, next) {
  try {
    const { teamId } = req.user;
    const { id }     = req.params;

    const monitor = await MonitoringEngine.pauseMonitor(id, teamId);
    return respond(res, 200, monitor);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/seo/monitors/:id/resume
 * Resume a paused monitor.
 */
async function resumeMonitor(req, res, next) {
  try {
    const { teamId } = req.user;
    const { id }     = req.params;

    const monitor = await MonitoringEngine.resumeMonitor(id, teamId);
    return respond(res, 200, monitor);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/seo/monitors/:id/timeline
 * Get score history for a monitor (for the detail panel chart).
 * Query: ?limit=30
 */
async function getTimeline(req, res, next) {
  try {
    const { teamId } = req.user;
    const { id }     = req.params;
    const limit      = Math.min(60, parseInt(req.query.limit, 10) || 30);

    const data = await MonitoringEngine.getMonitorTimeline(id, teamId, limit);
    return respond(res, 200, data);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/seo/monitors/:id/run-now
 * Immediately enqueue a monitor run (bypasses schedule).
 */
async function runNow(req, res, next) {
  try {
    const { teamId } = req.user;
    const { id }     = req.params;

    const { monitor } = await MonitoringEngine.getMonitorTimeline(id, teamId, 1);

    if (monitor.status === 'running') {
      throw AppError.conflict('This monitor is already running');
    }

    const job = await queues.seoMonitor.add(
      { monitorId: id },
      { jobId: `seo-monitor-${id}-manual-${Date.now()}` }
    );

    logger.info('SEO monitor run-now enqueued', { monitorId: id, jobId: job.id });
    return respond(res, 202, { message: 'Monitor run enqueued', jobId: String(job.id) });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMonitors,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  pauseMonitor,
  resumeMonitor,
  getTimeline,
  runNow,
};
