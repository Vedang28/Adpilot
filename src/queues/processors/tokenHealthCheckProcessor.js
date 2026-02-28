'use strict';

const IntegrationService = require('../../services/integrations/IntegrationService');
const logger             = require('../../config/logger');

/**
 * Token Health Check Processor
 *
 * Scheduled daily at 02:00 UTC via Bull repeating cron job.
 * Checks all active integrations that have tokenExpiresAt set,
 * and proactively refreshes any token expiring within the next 24 hours.
 *
 * This prevents silent token expiry between user-triggered syncs.
 *
 * Job data: {} (no payload required — scans all teams)
 */
module.exports = async function tokenHealthCheckProcessor(job) {
  logger.info('Token health check started', { jobId: job.id });

  // Refresh any token expiring within the next 24 hours
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

  const result = await IntegrationService.checkAndRefreshAllTokens(TWENTY_FOUR_HOURS_MS);

  logger.info('Token health check completed', {
    jobId:     job.id,
    checked:   result.checked,
    refreshed: result.refreshed,
    failed:    result.failed,
  });

  return result;
};
