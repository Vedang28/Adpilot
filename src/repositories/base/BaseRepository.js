'use strict';

/**
 * BaseRepository — generic Prisma CRUD with soft-delete, pagination, and team-scoping.
 *
 * Extend and override per-model:
 *   class CampaignRepository extends BaseRepository {
 *     constructor() { super('campaign'); }
 *   }
 */
class BaseRepository {
  /** @param {string} model — Prisma model name (camelCase) */
  constructor(model) {
    // Lazy-require to avoid circular deps with prisma singleton
    this.prisma = require('../../config/prisma');
    this.model  = model;
  }

  get db() {
    return this.prisma[this.model];
  }

  /** Find one by arbitrary where clause */
  async findOne(where, include = {}) {
    return this.db.findFirst({ where: { ...where, deletedAt: null }, include });
  }

  /** Find by primary key */
  async findById(id, include = {}) {
    return this.db.findFirst({ where: { id, deletedAt: null }, include });
  }

  /** Find by primary key scoped to a team */
  async findByIdForTeam(id, teamId, include = {}) {
    return this.db.findFirst({ where: { id, teamId, deletedAt: null }, include });
  }

  /** Paginated list with optional where/orderBy */
  async findMany({ where = {}, orderBy = { createdAt: 'desc' }, skip = 0, take = 20, include = {} } = {}) {
    const [items, total] = await Promise.all([
      this.db.findMany({ where: { ...where, deletedAt: null }, orderBy, skip, take, include }),
      this.db.count({ where: { ...where, deletedAt: null } }),
    ]);
    return { items, total };
  }

  /** Create a record */
  async create(data) {
    return this.db.create({ data });
  }

  /** Update by id */
  async update(id, data) {
    return this.db.update({ where: { id }, data });
  }

  /** Update many matching where */
  async updateMany(where, data) {
    return this.db.updateMany({ where, data });
  }

  /** Soft delete — sets deletedAt */
  async softDelete(id) {
    return this.db.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  /** Hard delete — use sparingly */
  async hardDelete(id) {
    return this.db.delete({ where: { id } });
  }

  /** Check existence */
  async exists(where) {
    const count = await this.db.count({ where: { ...where, deletedAt: null } });
    return count > 0;
  }

  /** Count */
  async count(where = {}) {
    return this.db.count({ where: { ...where, deletedAt: null } });
  }
}

module.exports = BaseRepository;
