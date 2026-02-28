'use strict';

const prisma               = require('../../config/prisma');
const NotificationService  = require('../../services/notifications/NotificationService');
const IntegrationService   = require('../../services/integrations/IntegrationService');
const SlackAdapter         = require('../../services/integrations/adapters/SlackAdapter');
const logger               = require('../../config/logger');

const SLACK_CHANNEL = process.env.SLACK_NOTIFICATION_CHANNEL || '#general';

/**
 * Notification delivery processor.
 * Job data: { notificationId }
 *
 * Delivery matrix:
 *   in_app → already persisted — mark sent immediately
 *   slack  → send via SlackAdapter using team's Slack integration
 *   email  → send via EmailService (Resend)
 */
module.exports = async function notificationsProcessor(job) {
  const { notificationId } = job.data;

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { team: { select: { name: true } } },
  });

  if (!notification) {
    logger.warn('notificationsProcessor: notification not found', { notificationId });
    return;
  }

  // Already delivered — skip (handles Bull retry duplicate)
  if (notification.status === 'sent') return;

  try {
    switch (notification.channel) {
      case 'in_app':
        // Already written to DB — mark sent
        await NotificationService.markSent(notificationId);
        break;

      case 'slack':
        await deliverSlack(notification);
        await NotificationService.markSent(notificationId);
        break;

      case 'email': {
        const EmailService = require('../../services/email/EmailService');
        await EmailService.sendNotification(notification);
        await NotificationService.markSent(notificationId);
        break;
      }

      default:
        logger.warn('notificationsProcessor: unknown channel', { channel: notification.channel });
        await NotificationService.markFailed(notificationId);
    }

    logger.info('Notification delivered', { notificationId, channel: notification.channel });
  } catch (err) {
    logger.error('Notification delivery failed', { notificationId, error: err.message });
    await NotificationService.markFailed(notificationId);
    throw err; // Let Bull handle retry
  }
};

async function deliverSlack(notification) {
  let tokens;
  try {
    tokens = await IntegrationService.getTokens(notification.teamId, 'slack');
  } catch {
    logger.warn('Slack integration not connected for team — skipping Slack delivery', {
      teamId: notification.teamId,
    });
    return;
  }

  await SlackAdapter.sendMessage({
    accessToken: tokens.accessToken,
    channel: SLACK_CHANNEL,
    text: `*[AdPilot]* ${notification.message}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AdPilot Alert*\n${notification.message}`,
        },
      },
    ],
  });
}
