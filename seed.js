const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);

  const team = await prisma.team.create({
    data: {
      name: 'AdPilot Demo Team',
      slug: 'adpilot-demo',
      plan: 'starter'
    }
  });

  await prisma.user.create({
    data: {
      email: 'admin@adpilot.com',
      name: 'Admin User',
      password: passwordHash,
      role: 'admin',
      teamId: team.id
    }
  });

  console.log('✅ Admin user created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());