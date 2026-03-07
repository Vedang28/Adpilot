'use strict';

const prisma   = require('../config/prisma');
const cache    = require('../cache');
const { withTimeout } = require('../utils/timeout');
const { success } = require('../common/response');
const anthropic = require('../services/ai/AnthropicService');
const gemini    = require('../services/ai/GeminiService');

// ── Helpers ───────────────────────────────────────────────────────────────────

function startOfWeek() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60)    return 'just now';
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

// ── Sub-queries (run in parallel) ─────────────────────────────────────────────

async function getAdStats(teamId) {
  const [total, thisWeek] = await Promise.all([
    prisma.ad.count({ where: { campaign: { teamId } } }),
    prisma.ad.count({ where: { campaign: { teamId }, createdAt: { gte: startOfWeek() } } }),
  ]);
  return { total, thisWeek };
}

async function getKeywordStats(teamId) {
  const keywords = await prisma.keyword.findMany({
    where: { teamId, isActive: true },
    select: { id: true, keyword: true, currentRank: true, previousRank: true, searchVolume: true },
    take: 30,
  });

  const withTrend = keywords.map(k => {
    const change = k.previousRank && k.currentRank ? k.previousRank - k.currentRank : 0;
    const trend = change > 2 ? 'rising' : change < -2 ? 'falling' : 'stable';
    return { ...k, trend, change };
  });

  const rising = withTrend.filter(k => k.trend === 'rising').length;
  const trending = withTrend
    .filter(k => k.trend === 'rising')
    .slice(0, 3)
    .map(k => ({ keyword: k.keyword, change: k.change, trend: 'rising' }));

  return { total: keywords.length, rising, trending, items: withTrend };
}

async function getCompetitorStats(teamId) {
  const competitors = await prisma.competitor.findMany({
    where: { teamId },
    select: { id: true, domain: true, name: true, createdAt: true },
    take: 20,
  });
  const newThisWeek = competitors.filter(c => new Date(c.createdAt) >= startOfWeek()).length;
  return { total: competitors.length, newThisWeek, items: competitors };
}

async function getAlertStats(teamId) {
  const [total, unread] = await Promise.all([
    prisma.notification.count({ where: { teamId, type: 'ALERT' } }),
    prisma.notification.count({ where: { teamId, type: 'ALERT', status: 'pending' } }),
  ]);
  return { total, urgent: unread };
}

async function getActivityFeed(teamId) {
  const notifications = await prisma.notification.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: { id: true, message: true, type: true, createdAt: true, status: true },
  });
  return notifications.map(n => ({
    id:      n.id,
    message: n.message.replace(/\s*\[rule:[^\]]+\]/g, '').trim(),
    type:    n.type,
    timeAgo: timeAgo(n.createdAt),
    unread:  n.status === 'pending',
  }));
}

// ── Action Item Generator ─────────────────────────────────────────────────────

const FALLBACK_ACTIONS = [
  {
    priority: 'HIGH',
    title: 'Add your first competitor',
    description: 'Track a competitor to get keyword gaps and strategic insights.',
    cta: 'Add Competitor',
    ctaUrl: '/research',
  },
  {
    priority: 'MEDIUM',
    title: 'Research trending keywords',
    description: 'Find keywords rising in your niche before competitors do.',
    cta: 'Research',
    ctaUrl: '/research',
  },
];

async function generateActionItems({ keywords, competitors, alerts }) {
  const context = [];

  const rising = (keywords?.items || []).filter(k => k.trend === 'rising').slice(0, 3);
  for (const kw of rising) {
    context.push(`Keyword "${kw.keyword}" is trending upward`);
  }

  if (competitors?.total > 0) {
    context.push(`You are tracking ${competitors.total} competitor(s)`);
  }

  if (alerts?.urgent > 0) {
    context.push(`${alerts.urgent} unread campaign alert(s) need attention`);
  }

  if (context.length === 0) return FALLBACK_ACTIONS;

  const prompt = `You are an ad strategy advisor. Based on these signals, generate 2-3 specific, actionable recommendations for a campaign manager. Each action should save real time or money.

Signals:
${context.join('\n')}

Return ONLY valid JSON array (no markdown):
[{
  "priority": "HIGH",
  "title": "short action title (max 8 words)",
  "description": "one sentence explaining why this matters",
  "cta": "button label (max 3 words)",
  "ctaUrl": "/relevant-route"
}]`;

  try {
    let raw = null;
    if (anthropic.isAvailable) {
      raw = await withTimeout(anthropic.generate(prompt), 6000).catch(() => null);
    }
    if (!raw && gemini.isAvailable) {
      raw = await withTimeout(gemini.generate(prompt), 6000).catch(() => null);
    }
    if (!raw) return FALLBACK_ACTIONS;

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json?\s*/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return FALLBACK_ACTIONS;
  }
}

// ── GET /api/v1/dashboard/metrics ─────────────────────────────────────────────

exports.getMetrics = async (req, res, next) => {
  const start = Date.now();
  try {
    const { teamId } = req.user;
    const cacheKey = `dashboard:metrics:${teamId}`;
    const cached = cache.get(cacheKey);
    if (cached) return success(res, { ...cached, meta: { cached: true, responseTime: Date.now() - start } });

    const [adStats, keywordStats, competitorStats, alertStats, activity] =
      await Promise.allSettled([
        getAdStats(teamId),
        getKeywordStats(teamId),
        getCompetitorStats(teamId),
        getAlertStats(teamId),
        getActivityFeed(teamId),
      ]);

    const ads        = adStats.status        === 'fulfilled' ? adStats.value        : { total: 0, thisWeek: 0 };
    const keywords   = keywordStats.status   === 'fulfilled' ? keywordStats.value   : { total: 0, rising: 0, trending: [], items: [] };
    const competitors = competitorStats.status === 'fulfilled' ? competitorStats.value : { total: 0, newThisWeek: 0 };
    const alerts     = alertStats.status     === 'fulfilled' ? alertStats.value     : { total: 0, urgent: 0 };
    const feed       = activity.status       === 'fulfilled' ? activity.value       : [];

    // Health score 0-100 based on engagement
    const healthScore = Math.min(100,
      (ads.total > 0 ? 25 : 0) +
      (keywords.total > 0 ? 25 : 0) +
      (competitors.total > 0 ? 25 : 0) +
      (feed.length > 0 ? 25 : 0)
    );
    const healthLabel = healthScore >= 75 ? 'Ad Intelligence Ready'
      : healthScore >= 50 ? 'Getting Started'
      : 'Set Up Your Account';

    const actionItems = await generateActionItems({ keywords, competitors, alerts });

    const result = {
      health: { score: healthScore, label: healthLabel },
      stats: {
        adsCreated:  { value: ads.total,          delta: ads.thisWeek,          deltaLabel: 'this week',  label: 'Ads Created' },
        keywords:    { value: keywords.total,      delta: keywords.rising,       deltaLabel: 'rising',    label: 'Keywords' },
        competitors: { value: competitors.total,   delta: competitors.newThisWeek, deltaLabel: 'new',     label: 'Competitors' },
        alerts:      { value: alerts.total,        urgent: alerts.urgent,         label: 'Active Alerts' },
      },
      actionItems,
      activityFeed: feed,
      keywordTrends: keywords.trending,
      demoMode: true, // no real integrations yet
    };

    cache.set(cacheKey, result, 120); // 2min cache
    return success(res, { ...result, meta: { cached: false, responseTime: Date.now() - start } });
  } catch (err) { next(err); }
};
