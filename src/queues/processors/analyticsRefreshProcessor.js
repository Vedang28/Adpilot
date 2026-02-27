'use strict';

const AnalyticsAggregator = require('../../services/analytics/AnalyticsAggregator');
const logger = require('../../config/logger');

/** Job data: { teamId } */
module.exports = async function analyticsRefreshProcessor(job) {
  const { teamId } = job.data;
  await AnalyticsAggregator.invalidateCache(teamId);
  await AnalyticsAggregator.getOverview(teamId); // re-warm cache
  logger.info('Analytics cache refreshed', { teamId });
  return { teamId };
};
