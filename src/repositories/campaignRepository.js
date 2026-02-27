'use strict';

const prisma = require('../config/prisma');

async function findAll({ teamId, status, platform }) {
  const where = { teamId };
  if (status) where.status = status;
  if (platform) where.platform = platform;

  return prisma.campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { ads: true } } },
  });
}

async function findById(id, teamId) {
  return prisma.campaign.findFirst({
    where: { id, teamId },
    include: { ads: true },
  });
}

async function create(data) {
  return prisma.campaign.create({ data });
}

async function update(id, teamId, data) {
  return prisma.campaign.updateMany({
    where: { id, teamId },
    data,
  });
}

async function findByIdRaw(id, teamId) {
  return prisma.campaign.findFirst({ where: { id, teamId } });
}

async function deleteOne(id, teamId) {
  return prisma.campaign.deleteMany({ where: { id, teamId } });
}

module.exports = { findAll, findById, create, update, findByIdRaw, deleteOne };
