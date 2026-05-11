/**
 * Dev utility — seed an initial admin user in lof_internal.syncflow.
 * Migrated from Mongoose to Prisma.
 *
 * For schema migrations use:    npx prisma migrate dev
 * For data seeding:              npx tsx src/scripts/init-db.ts
 *
 * NOTE: most users are auto-provisioned via the LOF Portal SSO callback
 * (/api/auth/lof-sso) on first sign-in. This script only seeds a local
 * admin@taskflow.com account that can use the legacy /api/auth/login route.
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('🔄 Seeding lof_internal.syncflow ...');

    const seedAdminEmail = 'admin@taskflow.com';
    const exists = await prisma.user.findUnique({
      where: { email: seedAdminEmail },
    });
    if (exists) {
      console.log(`✅ Admin user already exists: ${seedAdminEmail}`);
    } else {
      const password = await bcrypt.hash('admin123', 12);
      const admin = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: seedAdminEmail,
          password,
          role: 'admin',
          isActive: true,
        },
      });
      console.log(`✅ Created admin: ${admin.email}  (password: admin123)`);
    }

    const total = await prisma.user.count();
    console.log(`\n📊 Total users now: ${total}`);
  } catch (e) {
    console.error('❌ Seed failed:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected');
  }
}

main();
