import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const user = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      fullName: 'Administrator',
      email: 'admin@dlr.com',
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log('Admin user created:', user.username);
}

main().catch(console.error).finally(() => prisma.$disconnect());
