'use strict';

const ScalingAnalyzer = require('../services/scaling/ScalingAnalyzer');
const AppError        = require('../common/AppError');
const { success }     = require('../common/response');

// GET /api/v1/scaling/readiness?campaignId=X
exports.getCampaignReadiness = async (req, res, next) => {
  try {
    const { campaignId } = req.query;
    if (!campaignId) throw AppError.badRequest('campaignId query param is required');

    const result = await ScalingAnalyzer.analyze(campaignId, req.user.teamId);
    if (!result) throw AppError.notFound('Campaign not found');
    return success(res, result);
  } catch (err) { next(err); }
};

// GET /api/v1/scaling/all-campaigns
exports.getAllCampaignsReadiness = async (req, res, next) => {
  try {
    const campaigns = await ScalingAnalyzer.analyzeAll(req.user.teamId);
    return success(res, { campaigns });
  } catch (err) { next(err); }
};
