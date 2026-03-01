'use strict';

const prisma   = require('../config/prisma');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { success } = require('../common/response');
const logger   = require('../config/logger');

// Campaign metrics go inside the `performance` Json column
const DEMO_CAMPAIGNS = [
  { name: 'Summer Sale — Meta',          platform: 'Meta',   status: 'active',
    budget: 500, budgetType: 'daily',
    performance: { spend: 1240.50, roas: 4.2, clicks: 4200, impressions: 87000, ctr: 4.83 } },
  { name: 'Brand Awareness — Google',    platform: 'Google', status: 'paused',
    budget: 200, budgetType: 'daily',
    performance: { spend: 3100, roas: 2.8, clicks: 9800, impressions: 210000, ctr: 4.67 } },
  { name: 'Retargeting — Both Platforms',platform: 'Both',   status: 'active',
    budget: 75,  budgetType: 'daily',
    performance: { spend: 540,  roas: 6.1, clicks: 2100, impressions: 45000,  ctr: 4.67 } },
  { name: 'Q4 Lead Gen — Google',        platform: 'Google', status: 'draft',
    budget: 300, budgetType: 'daily',
    performance: {} },
];

const DEMO_NOTIFICATIONS = [
  { message: 'Summer Sale ROAS dropped 18% — monitoring closely', type: 'rule_triggered' },
  { message: 'SEO audit for demo-store.com scored 81/100 (Grade B)', type: 'audit_complete' },
  { message: 'Brand Awareness paused — daily budget limit reached',  type: 'rule_triggered' },
  { message: 'Retargeting ROAS hit 6.1x — consider scaling 15%',    type: 'audit_complete' },
  { message: '3 new keyword opportunities found for "summer sale"',  type: 'keyword_alert' },
];

exports.demoLogin = async (req, res, next) => {
  try {
    // Team.users is the direct relation (no TeamMember join table in this schema)
    let demoTeam = await prisma.team.findFirst({
      where:   { slug: 'adpilot-demo-public' },
      include: { users: true, campaigns: { select: { id: true } } },
    });

    if (!demoTeam) {
      logger.info('Creating demo team for first-time demo login');
      const hashedPw = await bcrypt.hash(`demo-${Date.now()}`, 10);

      // Create team first (User.teamId is required — cannot create user before team)
      demoTeam = await prisma.team.create({
        data: { name: 'AdPilot Live Demo', slug: 'adpilot-demo-public', plan: 'pro' },
      });

      await prisma.user.create({
        data: {
          name:    'Demo User',
          email:   `demo-${Date.now()}@adpilot-demo.internal`,
          password: hashedPw,
          role:    'admin',
          teamId:  demoTeam.id,
          onboardingCompleted: true,
        },
      });

      // Re-fetch with relations
      demoTeam = await prisma.team.findUnique({
        where:   { id: demoTeam.id },
        include: { users: true, campaigns: { select: { id: true } } },
      });
    }

    // Seed campaigns if missing (handles partial creation failures)
    if (demoTeam.campaigns.length === 0) {
      await prisma.campaign.createMany({
        data: DEMO_CAMPAIGNS.map(c => ({ ...c, teamId: demoTeam.id })),
      });
    }

    // Seed notifications if missing
    const demoUser = demoTeam.users[0];
    if (!demoUser) throw new Error('Demo team has no users — data integrity error');

    const notifCount = await prisma.notification.count({ where: { teamId: demoTeam.id } });
    if (notifCount === 0) {
      await prisma.notification.createMany({
        data: DEMO_NOTIFICATIONS.map(n => ({
          teamId:  demoTeam.id,
          userId:  demoUser.id,
          channel: 'in_app',
          status:  'pending',
          message: n.message,
          type:    n.type,
        })),
      });
    }

    const token = jwt.sign(
      { userId: demoUser.id, teamId: demoTeam.id, role: 'admin', isDemo: true },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return success(res, {
      accessToken: token,
      user: {
        id:     demoUser.id,
        name:   demoUser.name,
        email:  demoUser.email,
        role:   'admin',
        isDemo: true,
        onboardingCompleted: true,
      },
      team:   { id: demoTeam.id, name: 'AdPilot Live Demo', plan: 'pro' },
      isDemo: true,
    });
  } catch (err) {
    next(err);
  }
};
