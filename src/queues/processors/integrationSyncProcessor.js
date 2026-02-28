'use strict';

const prisma              = require('../../config/prisma');
const IntegrationService  = require('../../services/integrations/IntegrationService');
const MetricsCalculator   = require('../../services/analytics/MetricsCalculator');
const AnalyticsAggregator = require('../../services/analytics/AnalyticsAggregator');
const logger              = require('../../config/logger');

/**
 * Integration Sync Processor
 *
 * Job data: { teamId, provider, dateFrom?, dateTo? }
 *
 * Flow:
 *  1. Fetch platform campaign data via IntegrationService.syncData()
 *  2. For each platform campaign record:
 *     a. Find matching AdPilot campaign by externalId stored in performance JSON
 *     b. Fall back to name match if no externalId known yet
 *     c. Merge metrics into performance JSON (read-modify-write)
 *     d. Store externalId + budget resource name for future fast lookups
 *  3. Invalidate analytics cache so next dashboard load reflects new data
 *  4. Each campaign persisted independently — partial failures don't abort the batch
 *
 * Performance JSON keys written:
 *   {platform}_campaign_id     — external campaign ID (e.g. "meta_campaign_id")
 *   {platform}_budget_resource — Google Ads budget resource name
 *   spend, clicks, impressions, conversions, roas, ctr — always merged at root level
 */
module.exports = async function integrationSyncProcessor(job) {
  const { teamId, provider, dateFrom, dateTo } = job.data;

  // Default date range: last 7 days
  const to   = dateTo   || toDateString(new Date());
  const from = dateFrom || toDateString(daysAgo(7));

  logger.info('Integration sync started', { teamId, provider, from, to });

  // ── 1. Fetch platform data ───────────────────────────────────────────────
  let platformCampaigns;
  try {
    platformCampaigns = await IntegrationService.syncData(teamId, provider, {
      dateFrom: from,
      dateTo:   to,
    });
  } catch (err) {
    logger.error('Integration sync: fetchData failed', { teamId, provider, error: err.message });
    throw err; // Let Bull retry
  }

  if (!platformCampaigns.length) {
    logger.info('Integration sync: no campaigns returned from platform', { teamId, provider });
    return { synced: 0, unmatched: 0 };
  }

  // ── 2. Load all team campaigns once (avoid N+1 queries) ─────────────────
  const teamCampaigns = await prisma.campaign.findMany({
    where: { teamId, deletedAt: null },
    select: { id: true, name: true, platform: true, performance: true },
  });

  const externalIdKey     = (p) => `${p}_campaign_id`;
  const budgetResourceKey = (p) => `${p}_budget_resource`;

  // Build lookup indexes for O(1) matching
  const byExternalId = new Map(); // "meta_campaign_id:123" → campaign
  const byName       = new Map(); // lowercased name → campaign (fallback)

  for (const c of teamCampaigns) {
    const perf = c.performance || {};
    const extId = perf[externalIdKey(provider)];
    if (extId) byExternalId.set(String(extId), c);
    byName.set(c.name.toLowerCase().trim(), c);
  }

  // ── 3. Match and persist ─────────────────────────────────────────────────
  let synced    = 0;
  let unmatched = 0;

  for (const platformRecord of platformCampaigns) {
    try {
      // Find match: external ID first, name fallback
      let matched = byExternalId.get(String(platformRecord.externalId));
      if (!matched) {
        matched = byName.get((platformRecord.name || '').toLowerCase().trim());
      }

      if (!matched) {
        logger.debug('Integration sync: no matching campaign found', {
          provider,
          externalId: platformRecord.externalId,
          name:       platformRecord.name,
        });
        unmatched++;
        continue;
      }

      // Read existing performance to preserve non-sync fields
      const existing = matched.performance || {};

      // Derive calculated metrics
      const spend       = Number(platformRecord.spend)       || 0;
      const revenue     = Number(existing.revenue)           || 0; // revenue not from sync
      const clicks      = Number(platformRecord.clicks)      || 0;
      const impressions = Number(platformRecord.impressions) || 0;
      const conversions = Number(platformRecord.conversions) || 0;

      const merged = {
        ...existing,
        // Raw platform metrics
        spend,
        clicks,
        impressions,
        conversions,
        ctr: MetricsCalculator.ctr(clicks, impressions),
        cpa: MetricsCalculator.cpa(spend, conversions),
        // roas requires revenue — keep existing unless platform provides it
        roas: existing.roas || 0,
        // Store external identifiers for rule engine + future syncs
        [externalIdKey(provider)]:     String(platformRecord.externalId),
        // Google: store budget resource name so updateBudget can use it
        ...(platformRecord.budgetResourceName
          ? { [budgetResourceKey(provider)]: platformRecord.budgetResourceName }
          : {}),
        // Google: store accountId for context
        ...(platformRecord.customerId
          ? { [`${provider}_account_id`]: platformRecord.customerId }
          : {}),
        lastSyncedAt: new Date().toISOString(),
      };

      await prisma.campaign.update({
        where: { id: matched.id },
        data:  { performance: merged },
      });

      // Keep index current so later iterations in this batch can find by external ID
      byExternalId.set(String(platformRecord.externalId), { ...matched, performance: merged });

      synced++;
      logger.debug('Integration sync: campaign updated', {
        campaignId:  matched.id,
        name:        matched.name,
        externalId:  platformRecord.externalId,
        spend,
        clicks,
        impressions,
        conversions,
      });
    } catch (err) {
      // Partial failure — log and continue with next campaign
      logger.error('Integration sync: failed to persist campaign', {
        provider,
        externalId: platformRecord.externalId,
        name:       platformRecord.name,
        error:      err.message,
      });
    }
  }

  // ── 4. Invalidate analytics cache so dashboard reflects new data ─────────
  try {
    await AnalyticsAggregator.invalidateCache(teamId);
  } catch (err) {
    logger.warn('Integration sync: cache invalidation failed (non-fatal)', { error: err.message });
  }

  logger.info('Integration sync completed', {
    teamId, provider, total: platformCampaigns.length, synced, unmatched,
  });

  return { total: platformCampaigns.length, synced, unmatched };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(date) {
  return date.toISOString().split('T')[0]; // "YYYY-MM-DD"
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
