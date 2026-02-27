'use strict';

const prisma = require('../config/prisma');

async function findBySlug(slug) {
  return prisma.team.findUnique({ where: { slug } });
}

async function create({ name, slug, plan = 'starter' }) {
  return prisma.team.create({
    data: { name, slug, plan },
  });
}

module.exports = { findBySlug, create };
