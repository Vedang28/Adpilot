'use strict';

const DEFAULT_PAGE  = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT     = 100;

/**
 * Extract and normalize pagination params from req.query
 */
function parsePagination(query) {
  const page  = Math.max(parseInt(query.page, 10)  || DEFAULT_PAGE, 1);
  const limit = Math.min(parseInt(query.limit, 10) || DEFAULT_LIMIT, MAX_LIMIT);
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build Prisma orderBy from query string, e.g. sort=createdAt:desc
 */
function parseSort(query, allowed = []) {
  const raw = query.sort || 'createdAt:desc';
  const [field, dir] = raw.split(':');
  if (allowed.length && !allowed.includes(field)) return { createdAt: 'desc' };
  return { [field]: dir === 'asc' ? 'asc' : 'desc' };
}

module.exports = { parsePagination, parseSort };
