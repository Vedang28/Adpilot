'use strict';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

prisma.$on('error', (e) => {
  console.error('[Prisma Error]', e);
});

prisma.$on('warn', (e) => {
  console.warn('[Prisma Warn]', e);
});

module.exports = prisma;
