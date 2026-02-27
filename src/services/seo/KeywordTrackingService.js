'use strict';

const prisma            = require('../../config/prisma');
const { getRedis }      = require('../../config/redis');
const MetricsCalculator = require('../analytics/MetricsCalculator');
const logger            = require('../../config/logger');

/**
 * Keyword Opportunity Score formula:
 *   score = (searchVolume * CTR_potential) / (difficulty * competition_factor)
 *
 * CTR_potential:      estimated CTR at rank 1 (28%), rank 3 (11%), rank 10 (2.5%)
 * competition_factor: normalized [1..3] from difficulty
 */
const CTR_CURVE = [0, 0.28, 0.20, 0.11, 0.08, 0.06, 0.05, 0.04, 0.03, 0.025, 0.015];

class KeywordTrackingService {
  /**
   * Calculate opportunity score for a single keyword.
   */
  static opportunityScore({ searchVolume, difficulty, currentRank }) {
    const rank             = currentRank || 100;
    const ctrPotential     = rank <= 10 ? (CTR_CURVE[rank] || 0.015) : 0.01;
    const competitionFactor = 1 + (difficulty / 100) * 2; // 1..3
    const score = (searchVolume * ctrPotential) / (difficulty * competitionFactor);
    return parseFloat(score.toFixed(4));
  }

  /**
   * Detect rank changes vs previous values.
   * Uses Exponential Moving Average to smooth noisy rank data.
   */
  static detectRankChange(keyword) {
    const { currentRank, previousRank } = keyword;
    if (currentRank === null || previousRank === null) return { change: 0, trend: 'new', ema: currentRank };

    // EMA with alpha=0.4 to smooth daily fluctuations
    const history = [previousRank, currentRank];
    const ema     = MetricsCalculator.ema(history, 0.4);
    const change  = previousRank - currentRank; // positive = improved ranking

    const trend = change > 3 ? 'rising' : change < -3 ? 'falling' : 'stable';
    return { change, trend, ema: parseFloat(ema.toFixed(1)) };
  }

  /**
   * Fetch all keywords for a team, enriched with opportunity score + rank change.
   */
  async getKeywords(teamId, { page = 1, limit = 50 } = {}) {
    const skip = (page - 1) * limit;
    const [keywords, total] = await Promise.all([
      prisma.keyword.findMany({
        where: { teamId },
        orderBy: { searchVolume: 'desc' },
        skip,
        take: limit,
      }),
      prisma.keyword.count({ where: { teamId } }),
    ]);

    const enriched = keywords.map((kw) => ({
      ...kw,
      opportunityScore: KeywordTrackingService.opportunityScore(kw),
      rankChange: KeywordTrackingService.detectRankChange(kw),
    }));

    return { items: enriched, total };
  }

  /**
   * Simulate a rank update (in production: call SerpAPI / scraper).
   * Saves previousRank → currentRank rotation.
   */
  async syncRanks(teamId) {
    const keywords = await prisma.keyword.findMany({ where: { teamId } });
    const updates  = [];

    for (const kw of keywords) {
      // Stub: simulate ±3 rank drift — replace with real SERP call
      const drift      = Math.round((Math.random() - 0.5) * 6);
      const newRank    = kw.currentRank ? Math.max(1, kw.currentRank + drift) : null;
      const updated    = await prisma.keyword.update({
        where: { id: kw.id },
        data:  { previousRank: kw.currentRank, currentRank: newRank, lastCheckedAt: new Date() },
      });
      updates.push({ id: updated.id, keyword: updated.keyword, newRank, drift });
    }

    logger.info('Keyword ranks synced', { teamId, count: updates.length });
    return updates;
  }

  /**
   * Find top keyword opportunities for a team.
   * Returns keywords with score > threshold, sorted desc.
   */
  async getOpportunities(teamId, limit = 10) {
    const cacheKey = `seo:opportunities:${teamId}`;
    const redis    = getRedis();

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (_) { /* miss */ }

    const { items } = await this.getKeywords(teamId, { limit: 200 });
    const sorted = items
      .filter((kw) => kw.opportunityScore > 0)
      .sort((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, limit);

    try { await redis.setex(cacheKey, 600, JSON.stringify(sorted)); } catch (_) {}
    return sorted;
  }
}

module.exports = new KeywordTrackingService();
