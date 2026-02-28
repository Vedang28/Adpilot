'use strict';

const prisma  = require('../../config/prisma');
const logger  = require('../../config/logger');
const { queues } = require('../../queues');

/**
 * NotificationService — the single write path for all notifications.
 *
 * Responsibilities:
 *  1. Insert Notification row(s) with status = 'pending'
 *  2. Fan-out to relevant users if no specific userId is provided
 *  3. Enqueue a job so the processor handles actual delivery
 *
 * Never call prisma.notification.create() outside this service.
 */
class NotificationService {
  /**
   * Create one or more notification records and enqueue delivery jobs.
   *
   * @param {object} params
   * @param {string}  params.teamId      — required
   * @param {string}  [params.userId]    — if omitted, fans out to all admin+manager users
   * @param {string}  [params.campaignId]
   * @param {string}  params.type        — e.g. 'rule_fired', 'campaign_paused', 'budget_adjusted'
   * @param {string}  [params.channel]   — 'in_app' | 'slack' | 'email' (default: 'in_app')
   * @param {string}  params.message
   * @returns {Promise<object[]>}         — created notification records
   */
  async create({ teamId, userId, campaignId, type, channel = 'in_app', message }) {
    // Determine which users to notify
    let userIds;
    if (userId) {
      userIds = [userId];
    } else {
      // Fan out to all active admin + manager users on the team
      const users = await prisma.user.findMany({
        where: { teamId, role: { in: ['admin', 'manager'] }, isActive: true },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    }

    if (!userIds.length) {
      logger.warn('NotificationService: no eligible users to notify', { teamId, type });
      return [];
    }

    // Bulk insert — one record per user
    const created = await prisma.$transaction(
      userIds.map((uid) =>
        prisma.notification.create({
          data: {
            teamId,
            userId:     uid,
            campaignId: campaignId || null,
            type,
            channel,
            message,
            status: 'pending',
          },
        })
      )
    );

    // Enqueue a delivery job for each notification
    for (const notification of created) {
      await queues.notifications.add(
        { notificationId: notification.id },
        { jobId: notification.id } // deduplicate by notification ID
      );
    }

    logger.debug('Notifications created', { teamId, type, count: created.length, channel });
    return created;
  }

  /**
   * Mark a notification as delivered or failed.
   */
  async markSent(notificationId) {
    return prisma.notification.update({
      where: { id: notificationId },
      data:  { status: 'sent', sentAt: new Date() },
    });
  }

  async markFailed(notificationId) {
    return prisma.notification.update({
      where: { id: notificationId },
      data:  { status: 'failed' },
    });
  }
}

module.exports = new NotificationService();
