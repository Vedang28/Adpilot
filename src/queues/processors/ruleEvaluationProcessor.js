'use strict';

const prisma      = require('../../config/prisma');
const RuleEngine  = require('../../services/rules/RuleEngine');
const MetricsCalc = require('../../services/analytics/MetricsCalculator');
const logger      = require('../../config/logger');

/**
 * Job data: { teamId, campaignId? }
 * If campaignId provided: evaluate one campaign.
 * Otherwise: evaluate all active campaigns for the team.
 */
module.exports = async function ruleEvaluationProcessor(job) {
  const { teamId, campaignId } = job.data;

  let campaigns;
  if (campaignId) {
    const c = await prisma.campaign.findUnique({ where: { id: campaignId } });
    campaigns = c ? [c] : [];
  } else {
    campaigns = await prisma.campaign.findMany({ where: { teamId, status: 'active' } });
  }

  const allResults = [];

  for (const campaign of campaigns) {
    const p = campaign.performance || {};
    const metrics = {
      spend:       Number(p.spend)       || 0,
      clicks:      Number(p.clicks)      || 0,
      impressions: Number(p.impressions) || 0,
      conversions: Number(p.conversions) || 0,
      revenue:     Number(p.revenue)     || 0,
      roas:        Number(p.roas)        || 0,
      frequency:   Number(p.frequency)   || 0,
      ctr:         MetricsCalc.ctr(Number(p.clicks) || 0, Number(p.impressions) || 1),
      cpa:         MetricsCalc.cpa(Number(p.spend) || 0, Number(p.conversions) || 0),
    };

    try {
      const results = await RuleEngine.evaluate(campaign.id, metrics);
      allResults.push(...results);
    } catch (err) {
      logger.error('Rule evaluation error', { campaignId: campaign.id, error: err.message });
    }
  }

  logger.info('Rule evaluation done', { teamId, campaignCount: campaigns.length, rulesFired: allResults.length });
  return { evaluated: campaigns.length, fired: allResults.length };
};
