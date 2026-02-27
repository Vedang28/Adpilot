'use strict';

const prisma = require('../config/prisma');

async function findByCampaign(campaignId) {
  return prisma.ad.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  });
}

async function findById(id) {
  return prisma.ad.findUnique({ where: { id } });
}

async function create(data) {
  return prisma.ad.create({ data });
}

async function update(id, data) {
  return prisma.ad.update({ where: { id }, data });
}

async function deleteOne(id) {
  return prisma.ad.delete({ where: { id } });
}

module.exports = { findByCampaign, findById, create, update, deleteOne };
