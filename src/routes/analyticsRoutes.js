'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const prisma = require('../config/prisma');

const router = express.Router();

router.use(authenticate);

router.get('/overview', async (req, res, next) => {
  try {
    const { teamId } = req.user;

    const [allCampaigns, activeCampaigns] = await Promise.all([
      prisma.campaign.findMany({
        where: { teamId },
        select: {
          id: true,
          name: true,
          status: true,
          budget: true,
          performance: true,
        },
      }),
      prisma.campaign.count({ where: { teamId, status: 'active' } }),
    ]);

    const totalCampaigns = allCampaigns.length;
    const totalAdSpend = allCampaigns.reduce((sum, c) => {
      const perf = c.performance || {};
      return sum + (Number(perf.spend) || 0);
    }, 0);

    const roasValues = allCampaigns
      .map((c) => Number((c.performance || {}).roas))
      .filter((v) => v > 0);
    const avgROAS = roasValues.length
      ? (roasValues.reduce((a, b) => a + b, 0) / roasValues.length).toFixed(2)
      : 0;

    const topCampaign = allCampaigns.reduce((best, c) => {
      const spend = Number((c.performance || {}).spend) || 0;
      const bestSpend = Number(((best || {}).performance || {}).spend) || 0;
      return spend > bestSpend ? c : best;
    }, null);

    return res.status(200).json({
      success: true,
      data: {
        totalCampaigns,
        activeCampaigns,
        totalAdSpend: Number(totalAdSpend.toFixed(2)),
        avgROAS: Number(avgROAS),
        topCampaign: topCampaign
          ? { id: topCampaign.id, name: topCampaign.name }
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/campaigns', async (req, res, next) => {
  try {
    const { teamId } = req.user;

    const campaigns = await prisma.campaign.findMany({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        platform: true,
        status: true,
        budget: true,
        budgetType: true,
        performance: true,
        createdAt: true,
        _count: { select: { ads: true } },
      },
    });

    const data = campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      platform: c.platform,
      status: c.status,
      budget: Number(c.budget),
      budgetType: c.budgetType,
      adsCount: c._count.ads,
      spend: Number((c.performance || {}).spend) || 0,
      roas: Number((c.performance || {}).roas) || 0,
      clicks: Number((c.performance || {}).clicks) || 0,
      impressions: Number((c.performance || {}).impressions) || 0,
      createdAt: c.createdAt,
    }));

    return res.status(200).json({ success: true, data: { campaigns: data } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
