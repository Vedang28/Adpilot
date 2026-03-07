'use strict';

const prisma      = require('../config/prisma');
const cache       = require('../cache');
const { success } = require('../common/response');
const aggregator  = require('../services/analytics/AnalyticsAggregator');
const anthropic   = require('../services/ai/AnthropicService');
const gemini      = require('../services/ai/GeminiService');
const { withTimeout } = require('../utils/timeout');

function rangeToDate(range) {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ── GET /api/v1/reports/generate?range=7d|30d|90d ─────────────────────────────

exports.generate = async (req, res, next) => {
  try {
    const { teamId } = req.user;
    const range = ['7d', '30d', '90d'].includes(req.query.range) ? req.query.range : '30d';
    const cacheKey = `report:${teamId}:${range}`;

    const cached = cache.get(cacheKey);
    if (cached) return success(res, { ...cached, cached: true });

    const since = rangeToDate(range);

    // Parallel data fetch
    const [overview, campaigns, keywords, competitors, seoAudits, alerts] =
      await Promise.allSettled([
        aggregator.getOverview(teamId, range),
        prisma.campaign.findMany({
          where: { teamId },
          select: {
            id: true, name: true, platform: true, status: true,
            budget: true, performance: true,
            _count: { select: { ads: true } },
          },
        }),
        prisma.keyword.findMany({
          where: { teamId, isActive: true },
          select: { keyword: true, currentRank: true, previousRank: true, searchVolume: true },
          take: 20,
        }),
        prisma.competitor.findMany({
          where: { teamId },
          select: { domain: true, name: true, createdAt: true },
          take: 10,
        }),
        prisma.seoAudit.findMany({
          where: { teamId, createdAt: { gte: since } },
          select: { url: true, overallScore: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.notification.count({ where: { teamId, type: 'ALERT', createdAt: { gte: since } } }),
      ]);

    const ov   = overview.status    === 'fulfilled' ? overview.value    : {};
    const cpgs = campaigns.status   === 'fulfilled' ? campaigns.value   : [];
    const kws  = keywords.status    === 'fulfilled' ? keywords.value    : [];
    const comp = competitors.status === 'fulfilled' ? competitors.value : [];
    const seo  = seoAudits.status   === 'fulfilled' ? seoAudits.value   : [];
    const alertCount = alerts.status === 'fulfilled' ? alerts.value : 0;

    // Build campaign performance rows
    const campaignRows = cpgs.map(c => {
      const p = c.performance || {};
      const spend   = Number(p.spend)   || 0;
      const revenue = Number(p.revenue) || 0;
      const clicks  = Number(p.clicks)  || 0;
      const imps    = Number(p.impressions) || 0;
      const conv    = Number(p.conversions) || 0;
      const roas    = spend > 0 ? parseFloat((revenue / spend).toFixed(2)) : 0;
      const ctr     = imps > 0  ? parseFloat(((clicks / imps) * 100).toFixed(2)) : 0;
      const cpa     = conv > 0  ? parseFloat((spend / conv).toFixed(2)) : 0;
      return { name: c.name, platform: c.platform, status: c.status, budget: Number(c.budget), adsCount: c._count.ads, spend, revenue, roas, ctr, cpa };
    });

    // Keyword highlights
    const risingKws = kws
      .filter(k => k.previousRank && k.currentRank && k.previousRank > k.currentRank)
      .slice(0, 5)
      .map(k => ({ keyword: k.keyword, change: k.previousRank - k.currentRank, rank: k.currentRank }));

    const fallingKws = kws
      .filter(k => k.previousRank && k.currentRank && k.currentRank > k.previousRank)
      .slice(0, 5)
      .map(k => ({ keyword: k.keyword, change: k.previousRank - k.currentRank, rank: k.currentRank }));

    // AI executive summary — non-blocking, 6s timeout
    let summary = null;
    const summaryPrompt = `You are an advertising analyst. Write a concise 3-sentence executive summary of this account's performance for the past ${range}.

Metrics:
- Total ad spend: $${ov.totalAdSpend || 0}
- Total revenue: $${ov.totalRevenue || 0}
- Average ROAS: ${ov.avgROAS || 0}x
- Overall CTR: ${ov.overallCTR || 0}%
- Total conversions: ${ov.totalConversions || 0}
- Active campaigns: ${ov.activeCampaigns || 0}/${ov.totalCampaigns || 0}
- Budget alerts fired: ${alertCount}
- Health score: ${(ov.health || {}).score || 'N/A'}/100

Return ONLY a JSON object: {"summary": "...", "highlight": "best win in one sentence", "warning": "biggest risk in one sentence"}`;

    try {
      let raw = null;
      if (anthropic.isAvailable) raw = await withTimeout(anthropic.generate(summaryPrompt), 6000).catch(() => null);
      if (!raw && gemini.isAvailable) raw = await withTimeout(gemini.generate(summaryPrompt), 6000).catch(() => null);
      if (raw) {
        const cleaned = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
        summary = JSON.parse(cleaned);
      }
    } catch { /* non-critical */ }

    const report = {
      range,
      generatedAt: new Date().toISOString(),
      overview: {
        totalSpend:      ov.totalAdSpend      || 0,
        totalRevenue:    ov.totalRevenue      || 0,
        avgROAS:         ov.avgROAS           || 0,
        overallCTR:      ov.overallCTR        || 0,
        totalConversions: ov.totalConversions || 0,
        totalClicks:     ov.totalClicks       || 0,
        totalImpressions: ov.totalImpressions || 0,
        health:          ov.health            || { score: 0, label: 'Unknown' },
        activeCampaigns: ov.activeCampaigns   || 0,
        totalCampaigns:  ov.totalCampaigns    || 0,
      },
      campaigns:       campaignRows,
      keywords:        { rising: risingKws, falling: fallingKws, total: kws.length },
      competitors:     { total: comp.length, domains: comp.map(c => c.domain || c.name) },
      seoAudits:       seo,
      alertsFired:     alertCount,
      aiSummary:       summary,
    };

    cache.set(cacheKey, report, 600); // 10min
    return success(res, { ...report, cached: false });
  } catch (err) { next(err); }
};
