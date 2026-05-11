/**
 * Dev utility — list all users in the SyncFlow Postgres DB.
 * Migrated from Mongoose to Prisma.
 *
 * Run with:    npx tsx src/scripts/check-users.ts
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('👥 Reading users from lof_internal.syncflow ...');
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        empId: true,
        vertex: true,
        isActive: true,
        lastLogin: true,
      },
    });

    console.log(`\n📊 Found ${users.length} users:`);
    console.log('='.repeat(60));
    users.forEach((u, i) => {
      console.log(`${i + 1}. ${u.name}`);
      console.log(`   Email:   ${u.email}`);
      console.log(`   Role:    ${u.role}`);
      console.log(`   EmpId:   ${u.empId ?? 'N/A'}`);
      console.log(`   Vertex:  ${u.vertex ?? 'N/A'}`);
      console.log(`   Active:  ${u.isActive}`);
      console.log(
        `   LastLogin: ${u.lastLogin ? u.lastLogin.toISOString() : 'never'}`
      );
      console.log('-'.repeat(40));
    });
  } catch (e) {
    console.error('❌ Error checking users:', e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Disconnected from database');
  }
}

main();
