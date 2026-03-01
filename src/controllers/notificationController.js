'use strict';

const prisma  = require('../config/prisma');
const { success } = require('../common/response');

exports.getNotifications = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const notifications = await prisma.notification.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    20,
    });
    const unreadCount = notifications.filter((n) => n.status === 'pending').length;
    return success(res, { notifications, unreadCount });
  } catch (err) { next(err); }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const { userId } = req.user;
    await prisma.notification.updateMany({
      where: { userId, status: 'pending' },
      data:  { status: 'read' },
    });
    return success(res, { message: 'All notifications marked as read' });
  } catch (err) { next(err); }
};
