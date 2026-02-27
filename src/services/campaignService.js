'use strict';

const campaignRepo = require('../repositories/campaignRepository');
const { AppError } = require('../middleware/errorHandler');

async function getAllCampaigns(teamId, filters = {}) {
  return campaignRepo.findAll({ teamId, ...filters });
}

async function getCampaignById(id, teamId) {
  const campaign = await campaignRepo.findById(id, teamId);
  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }
  return campaign;
}

async function createCampaign(teamId, data) {
  return campaignRepo.create({ ...data, teamId });
}

async function updateCampaign(id, teamId, data) {
  const campaign = await campaignRepo.findByIdRaw(id, teamId);
  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }
  await campaignRepo.update(id, teamId, data);
  return campaignRepo.findByIdRaw(id, teamId);
}

async function deleteCampaign(id, teamId) {
  const campaign = await campaignRepo.findByIdRaw(id, teamId);
  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }
  await campaignRepo.deleteOne(id, teamId);
}

module.exports = {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
};
