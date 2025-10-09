import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectToDatabase from '@/lib/database';
import User from '@/models/User';
import mongoose from 'mongoose';

async function checkUsers() {
  try {
    console.log('🔄 Connecting to database...');
    await connectToDatabase();

    console.log('👥 Checking users in database...');
    const users = await User.find({}, 'name email role empId vertex isActive').lean();

    console.log(`\n📊 Found ${users.length} users:`);
    console.log('='.repeat(60));

    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   EmpId: ${user.empId || 'N/A'}`);
      console.log(`   Vertex: ${user.vertex || 'N/A'}`);
      console.log(`   Active: ${user.isActive}`);
      console.log('-'.repeat(40));
    });

    // Test specific users
    console.log('\n🔍 Testing specific user credentials:');

    const testUsers = [
      { email: 'admin@taskflow.com', expectedRole: 'admin' },
      { email: 'alex.j@taskflow.com', expectedRole: 'user' },
      { email: 'client@example.com', expectedRole: 'client' }
    ];

    for (const testUser of testUsers) {
      const foundUser = await User.findOne({ email: testUser.email }).select('+password');
      if (foundUser) {
        console.log(`✅ ${testUser.email} - Role: ${foundUser.role} (Expected: ${testUser.expectedRole})`);

        // Test password
        const isPasswordValid = await foundUser.comparePassword(
          testUser.expectedRole === 'admin' ? 'admin123' :
          testUser.expectedRole === 'user' ? 'user123' : 'client123'
        );
        console.log(`   Password test: ${isPasswordValid ? '✅ Valid' : '❌ Invalid'}`);
      } else {
        console.log(`❌ ${testUser.email} - NOT FOUND`);
      }
    }

  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the check
checkUsers()
  .then(() => {
    console.log('✅ User check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ User check failed:', error);
    process.exit(1);
  });