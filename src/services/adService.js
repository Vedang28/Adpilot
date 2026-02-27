'use strict';

const adRepo = require('../repositories/adRepository');
const campaignRepo = require('../repositories/campaignRepository');
const { AppError } = require('../middleware/errorHandler');

async function getAdsByCampaign(campaignId, teamId) {
  // Verify campaign belongs to team
  const campaign = await campaignRepo.findByIdRaw(campaignId, teamId);
  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }
  return adRepo.findByCampaign(campaignId);
}

async function createAd(campaignId, data) {
  return adRepo.create({ ...data, campaignId });
}

async function updateAd(id, data) {
  const ad = await adRepo.findById(id);
  if (!ad) {
    throw new AppError('Ad not found', 404);
  }
  return adRepo.update(id, data);
}

async function deleteAd(id) {
  const ad = await adRepo.findById(id);
  if (!ad) {
    throw new AppError('Ad not found', 404);
  }
  return adRepo.deleteOne(id);
}

async function generateAdWithAI(campaignId, brief, teamId) {
  // Verify campaign belongs to team
  const campaign = await campaignRepo.findByIdRaw(campaignId, teamId);
  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }

  // AI stub: returns 3 mock ad variations
  const variations = [
    {
      headline: `${brief.productName || 'Your Product'} – Trusted by Thousands`,
      primaryText: `Discover how ${brief.productName || 'our solution'} can transform your business. ${brief.keyBenefit || 'Get results fast.'}`,
      description: 'Learn more and get started today.',
      ctaType: 'LEARN_MORE',
      platform: campaign.platform,
      status: 'draft',
    },
    {
      headline: `${brief.offer || 'Limited Time'} – Act Now`,
      primaryText: `Don't miss out on ${brief.productName || 'this offer'}. ${brief.urgency || 'Limited spots available.'}`,
      description: "Claim your spot before it's too late.",
      ctaType: 'SIGN_UP',
      platform: campaign.platform,
      status: 'draft',
    },
    {
      headline: `Why Choose ${brief.productName || 'Us'}?`,
      primaryText: `${brief.differentiator || 'We deliver results that matter.'}  Join thousands of happy customers.`,
      description: 'See the difference for yourself.',
      ctaType: 'GET_QUOTE',
      platform: campaign.platform,
      status: 'draft',
    },
  ];

  return variations;
}

module.exports = {
  getAdsByCampaign,
  createAd,
  updateAd,
  deleteAd,
  generateAdWithAI,
};
