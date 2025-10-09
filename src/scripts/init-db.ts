import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import connectToDatabase from '@/lib/database';
import User from '@/models/User';
import Task from '@/models/Task';
import Project from '@/models/Project';
import Notification from '@/models/Notification';
import { MOCK_TASKS, ALL_USERS, TEAM_MEMBERS, CLIENT_USERS, PMO_MEMBERS } from '@/lib/mock-data';
import mongoose from 'mongoose';

async function initializeDatabase() {
  try {
    console.log('🔍 Checking environment variables...');
    console.log('MONGODB_URI:', process.env.MONGODB_URI ? '✅ Loaded' : '❌ Missing');
    console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Loaded' : '❌ Missing');

    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env.local file');
    }

    console.log('🔄 Connecting to database...');
    await connectToDatabase();

    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Task.deleteMany({});
    await Project.deleteMany({});
    await Notification.deleteMany({});

    console.log('👥 Creating users...');

    // Create Admin Users
    const adminUsers = await Promise.all(
      PMO_MEMBERS.map(async (user) => {
        return await User.create({
          name: user.name,
          email: user.email,
          password: 'admin123', // Default password
          role: user.role,
          designation: 'Administrator',
          isActive: true
        });
      })
    );

    // Create Team Members (Users)
    const teamUsers = await Promise.all(
      TEAM_MEMBERS.map(async (member) => {
        return await User.create({
          name: member.name,
          email: member.email,
          password: 'user123', // Default password
          role: member.role,
          empId: member.empId,
          designation: member.designation,
          isActive: true
        });
      })
    );

    // Create Client Users
    const clientUsers = await Promise.all(
      CLIENT_USERS.map(async (client, index) => {
        const vertices = ['CMIS', 'LOF', 'TRI', 'TRG', 'VB World'];
        return await User.create({
          name: client.name,
          email: client.email,
          password: 'client123', // Default password
          role: client.role,
          vertex: vertices[index % vertices.length],
          designation: 'Client Representative',
          isActive: true
        });
      })
    );

    console.log('✅ Users created successfully!');
    console.log(`   - ${adminUsers.length} admin users`);
    console.log(`   - ${teamUsers.length} team members`);
    console.log(`   - ${clientUsers.length} client users`);

    // Create a mapping of names to user IDs for tasks
    const allCreatedUsers = [...adminUsers, ...teamUsers, ...clientUsers];
    const userMap = new Map<string, mongoose.Types.ObjectId>();
    allCreatedUsers.forEach(user => {
      userMap.set(user.name, user._id);
    });

    console.log('📋 Creating tasks...');

    // Create tasks based on mock data
    const adminUser = adminUsers[0]; // Use first admin as creator
    const tasks = await Promise.all(
      MOCK_TASKS.map(async (taskData) => {
        const assignedUserId = userMap.get(taskData.assignedTo);
        if (!assignedUserId) {
          console.warn(`⚠️  User not found for task assignment: ${taskData.assignedTo}`);
          return null;
        }

        return await Task.create({
          name: taskData.name,
          assignedTo: assignedUserId,
          assignedToName: taskData.assignedTo,
          assigneeEmail: taskData.assigneeEmail || '',
          status: taskData.status,
          progress: taskData.progress,
          startDate: new Date(taskData.startDate),
          endDate: new Date(taskData.endDate),
          createdDate: new Date(taskData.createdDate),
          client: taskData.client,
          clientEmail: taskData.clientEmail,
          vertex: taskData.vertex,
          typeOfWork: taskData.typeOfWork,
          category: taskData.category,
          workingHours: taskData.workingHours,
          actualWorkingHours: taskData.actualWorkingHours,
          priority: taskData.priority,
          completionDate: taskData.completionDate ? new Date(taskData.completionDate) : undefined,
          reviewStatus: taskData.reviewStatus,
          remarks: taskData.remarks,
          createdBy: adminUser._id,
          isArchived: false
        });
      })
    );

    const validTasks = tasks.filter(task => task !== null);
    console.log(`✅ Created ${validTasks.length} tasks successfully!`);

    // Create sample notifications
    console.log('🔔 Creating sample notifications...');
    const notifications = [];

    for (const user of [...teamUsers, ...clientUsers]) {
      // Create welcome notification
      notifications.push(
        await Notification.create({
          title: 'Welcome to SyncFlow!',
          message: 'You have been successfully added to the SyncFlow task management system.',
          type: 'success',
          userId: user._id,
          createdBy: adminUser._id,
          isRead: false
        })
      );

      // Create task assignment notification for team members
      if (user.role === 'user') {
        const userTasks = validTasks.filter(task => task?.assignedToName === user.name);
        if (userTasks.length > 0) {
          notifications.push(
            await Notification.create({
              title: 'New Task Assigned',
              message: `You have ${userTasks.length} task(s) assigned to you.`,
              type: 'info',
              userId: user._id,
              taskId: userTasks[0]?._id,
              createdBy: adminUser._id,
              isRead: false
            })
          );
        }
      }
    }

    console.log(`✅ Created ${notifications.length} notifications successfully!`);

    // Create a sample project
    console.log('📁 Creating sample project...');
    const sampleProject = await Project.create({
      name: 'SyncFlow Implementation Project',
      description: 'Main project for implementing the SyncFlow task management system',
      tasks: validTasks.map(task => task!._id),
      client: 'Internal Development',
      vertex: 'TRG',
      startDate: new Date(),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
      status: 'In Progress',
      typeOfWork: 'Development',
      estimatedHours: validTasks.reduce((sum, task) => sum + (task?.workingHours || 0), 0),
      budget: 100000,
      createdBy: adminUser._id,
      isArchived: false
    });

    console.log('✅ Sample project created successfully!');

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Total Users: ${allCreatedUsers.length}`);
    console.log(`   - Total Tasks: ${validTasks.length}`);
    console.log(`   - Total Notifications: ${notifications.length}`);
    console.log(`   - Total Projects: 1`);

    console.log('\n🔐 Default Login Credentials:');
    console.log('   Admin: admin@taskflow.com / admin123');
    console.log('   User: alex.j@taskflow.com / user123');
    console.log('   Client: client@example.com / client123');

  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the initialization if this file is executed directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('✅ Database initialization script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database initialization failed:', error);
      process.exit(1);
    });
}

export default initializeDatabase;