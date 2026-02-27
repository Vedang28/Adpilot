'use strict';

const prisma   = require('../../config/prisma');
const bcrypt   = require('bcrypt');
const AppError = require('../../common/AppError');
const logger   = require('../../config/logger');

const SALT_ROUNDS = 12;

const PERMISSIONS = {
  admin: {
    campaigns: ['read', 'write', 'delete', 'launch'],
    ads:       ['read', 'write', 'delete'],
    seo:       ['read', 'write'],
    analytics: ['read'],
    rules:     ['read', 'write', 'delete'],
    team:      ['read', 'write', 'invite', 'remove'],
    integrations: ['read', 'write', 'delete'],
  },
  manager: {
    campaigns: ['read', 'write', 'launch'],
    ads:       ['read', 'write'],
    seo:       ['read', 'write'],
    analytics: ['read'],
    rules:     ['read', 'write'],
    team:      ['read', 'invite'],
    integrations: ['read'],
  },
  member: {
    campaigns: ['read'],
    ads:       ['read'],
    seo:       ['read'],
    analytics: ['read'],
    rules:     ['read'],
    team:      ['read'],
    integrations: [],
  },
};

class TeamService {
  static getPermissions(role) {
    return PERMISSIONS[role] || PERMISSIONS.member;
  }

  static hasPermission(role, resource, action) {
    const perms = PERMISSIONS[role];
    if (!perms) return false;
    return perms[resource]?.includes(action) || false;
  }

  async getTeam(teamId) {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        users: {
          where:   { isActive: true },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
      },
    });
    if (!team) throw AppError.notFound('Team');
    return team;
  }

  async getMembers(teamId) {
    return prisma.user.findMany({
      where:   { teamId, isActive: true },
      select:  { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMemberRole(teamId, targetUserId, newRole, requestingUserId) {
    if (!['admin', 'manager', 'member'].includes(newRole)) {
      throw AppError.badRequest(`Invalid role: ${newRole}`);
    }
    // Cannot change own role
    if (targetUserId === requestingUserId) {
      throw AppError.badRequest('Cannot change your own role');
    }
    const user = await prisma.user.findFirst({ where: { id: targetUserId, teamId } });
    if (!user) throw AppError.notFound('Team member');

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data:  { role: newRole },
      select: { id: true, name: true, email: true, role: true },
    });

    logger.info('Member role updated', { teamId, targetUserId, newRole, by: requestingUserId });
    return updated;
  }

  async removeMember(teamId, targetUserId, requestingUserId) {
    if (targetUserId === requestingUserId) {
      throw AppError.badRequest('Cannot remove yourself');
    }
    const user = await prisma.user.findFirst({ where: { id: targetUserId, teamId } });
    if (!user) throw AppError.notFound('Team member');

    // Soft-deactivate rather than delete
    await prisma.user.update({ where: { id: targetUserId }, data: { isActive: false } });
    logger.info('Member removed', { teamId, targetUserId, by: requestingUserId });
  }

  async updateTeam(teamId, { name, timezone }) {
    return prisma.team.update({
      where: { id: teamId },
      data:  { name, timezone },
    });
  }
}

module.exports = new TeamService();
module.exports.PERMISSIONS = PERMISSIONS;
