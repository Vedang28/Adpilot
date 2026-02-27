'use strict';

const { randomBytes }  = require('crypto');
const bcrypt           = require('bcrypt');
const prisma           = require('../../config/prisma');
const AppError         = require('../../common/AppError');
const logger           = require('../../config/logger');

const INVITE_TTL_HOURS = 48;
const SALT_ROUNDS      = 12;

class InviteService {
  /**
   * Create a one-time invite token for an email.
   * Idempotent: re-inviting the same email invalidates the previous invite.
   */
  async createInvite(teamId, email, role = 'member') {
    if (!['admin', 'manager', 'member'].includes(role)) {
      throw AppError.badRequest(`Invalid role: ${role}`);
    }

    // Check if user is already in the team
    const existing = await prisma.user.findFirst({ where: { email, teamId } });
    if (existing) throw AppError.conflict(`${email} is already a team member`);

    // Invalidate any existing pending invite for this email+team
    await prisma.teamInvite.updateMany({
      where: { teamId, email, usedAt: null },
      data:  { expiresAt: new Date() }, // expire immediately
    });

    const token     = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3_600_000);

    const invite = await prisma.teamInvite.create({
      data: { teamId, email, role, token, expiresAt },
    });

    const inviteUrl = `${process.env.INVITE_BASE_URL || 'http://localhost:5173'}/accept-invite?token=${token}`;

    logger.info('Invite created', { teamId, email, role });

    return { invite, inviteUrl };
  }

  /**
   * Accept an invite: validate token, create user, mark invite used.
   */
  async acceptInvite(token, { name, password }) {
    const invite = await prisma.teamInvite.findUnique({ where: { token } });

    if (!invite)                              throw AppError.badRequest('Invalid invite token');
    if (invite.usedAt)                        throw AppError.badRequest('Invite already used');
    if (new Date() > new Date(invite.expiresAt)) throw AppError.badRequest('Invite has expired');

    const existingUser = await prisma.user.findFirst({ where: { email: invite.email } });
    if (existingUser) throw AppError.conflict('An account with this email already exists');

    const hashedPwd = await bcrypt.hash(password, SALT_ROUNDS);

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          teamId:   invite.teamId,
          email:    invite.email,
          name,
          password: hashedPwd,
          role:     invite.role,
        },
      }),
      prisma.teamInvite.update({
        where: { id: invite.id },
        data:  { usedAt: new Date() },
      }),
    ]);

    logger.info('Invite accepted', { userId: user.id, email: user.email, teamId: user.teamId });
    return user;
  }

  async listInvites(teamId) {
    return prisma.teamInvite.findMany({
      where:   { teamId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select:  { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    });
  }

  async revokeInvite(inviteId, teamId) {
    const invite = await prisma.teamInvite.findFirst({ where: { id: inviteId, teamId } });
    if (!invite) throw AppError.notFound('Invite');
    await prisma.teamInvite.delete({ where: { id: inviteId } });
  }
}

module.exports = new InviteService();
