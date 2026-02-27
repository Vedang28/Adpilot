'use strict';

const SeoAuditService = require('../../services/seo/SeoAuditService');
const logger          = require('../../config/logger');

/**
 * Job data: { teamId, url }
 * Idempotent: re-running the same URL just creates a new audit record (fine).
 */
module.exports = async function seoAuditProcessor(job) {
  const { teamId, url } = job.data;
  logger.info('SEO audit job started', { jobId: job.id, teamId, url });

  const audit = await SeoAuditService.audit(teamId, url);

  logger.info('SEO audit job done', { jobId: job.id, score: audit.overallScore });
  return { auditId: audit.id, score: audit.overallScore };
};
