'use strict';

const KeywordTrackingService = require('../../services/seo/KeywordTrackingService');
const logger = require('../../config/logger');

/** Job data: { teamId } */
module.exports = async function keywordSyncProcessor(job) {
  const { teamId } = job.data;
  logger.info('Keyword sync job started', { jobId: job.id, teamId });

  const updates = await KeywordTrackingService.syncRanks(teamId);

  logger.info('Keyword sync done', { jobId: job.id, updated: updates.length });
  return { updated: updates.length };
};
