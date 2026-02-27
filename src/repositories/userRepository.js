'use strict';

const prisma = require('../config/prisma');

async function findByEmail(email) {
  return prisma.user.findUnique({ where: { email } });
}

async function findById(id) {
  return prisma.user.findUnique({ where: { id } });
}

async function create({ name, email, password, teamId, role = 'admin' }) {
  return prisma.user.create({
    data: { name, email, password, teamId, role },
  });
}

module.exports = { findByEmail, findById, create };
