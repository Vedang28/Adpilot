'use strict';

const seoAuditService     = require('../services/seo/SeoAuditService');
const keywordService      = require('../services/seo/KeywordTrackingService');
const competitorService   = require('../services/seo/CompetitorGapService');
const contentBriefService = require('../services/seo/ContentBriefService');
const { queues }          = require('../queues');
const { success, created, paginated } = require('../common/response');
const { parsePagination } = require('../common/pagination');

exports.triggerAudit = async (req, res, next) => {
  try {
    const { url } = req.body;
    const job = await queues.seoAudit.add({ teamId: req.user.teamId, url }, { jobId: `audit:${req.user.teamId}:${Date.now()}` });
    return created(res, { jobId: job.id, message: 'SEO audit queued' });
  } catch (err) { next(err); }
};

exports.getAudits = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const { items, total } = await seoAuditService.getAudits(req.user.teamId, { page, limit });
    return paginated(res, items, total, page, limit);
  } catch (err) { next(err); }
};

exports.getKeywords = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await keywordService.getKeywords(req.user.teamId, { page, limit });
    return paginated(res, items, total, page, limit);
  } catch (err) { next(err); }
};

exports.getOpportunities = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const data  = await keywordService.getOpportunities(req.user.teamId, limit);
    return success(res, { opportunities: data });
  } catch (err) { next(err); }
};

exports.syncKeywords = async (req, res, next) => {
  try {
    const job = await queues.keywordSync.add({ teamId: req.user.teamId });
    return success(res, { jobId: job.id, message: 'Keyword sync queued' });
  } catch (err) { next(err); }
};

exports.getCompetitorGaps = async (req, res, next) => {
  try {
    const { competitorId } = req.query;
    const result = await competitorService.analyze(req.user.teamId, competitorId || null);
    return success(res, result);
  } catch (err) { next(err); }
};

exports.generateBrief = async (req, res, next) => {
  try {
    const { targetKeyword } = req.body;
    const brief = await contentBriefService.generate(req.user.teamId, targetKeyword);
    return created(res, { brief });
  } catch (err) { next(err); }
};

exports.getBriefs = async (req, res, next) => {
  try {
    const { page, limit } = parsePagination(req.query);
    const { items, total } = await contentBriefService.getBriefs(req.user.teamId, { page, limit });
    return paginated(res, items, total, page, limit);
  } catch (err) { next(err); }
};
