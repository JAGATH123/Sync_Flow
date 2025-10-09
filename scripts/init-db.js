const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/syncflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['admin', 'user', 'client', 'system'],
    default: 'user'
  },
  empId: { type: String, unique: true, sparse: true },
  designation: { type: String },
  vertex: {
    type: String,
    enum: ['CMIS', 'LOF', 'TRI', 'TRG', 'VB World', 'CMG', 'Jahangir', 'LOF Curriculum']
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Sample data to initialize
const initializeData = async () => {
  try {
    console.log('🚀 Starting database initialization...');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@syncflow.com' });

    if (!existingAdmin) {
      console.log('👤 Creating default admin user...');

      const hashedPassword = await bcrypt.hash('admin123', 12);

      const adminUser = new User({
        name: 'Admin User',
        email: 'admin@syncflow.com',
        password: hashedPassword,
        role: 'admin',
        empId: 'EMP001',
        designation: 'System Administrator',
        vertex: 'TRG',
        isActive: true
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully');
      console.log('📧 Email: admin@syncflow.com');
      console.log('🔑 Password: admin123');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    // Create sample team members
    const sampleUsers = [
      {
        name: 'John Smith',
        email: 'john.smith@syncflow.com',
        password: await bcrypt.hash('user123', 12),
        role: 'user',
        empId: 'EMP002',
        designation: 'Senior Developer',
        vertex: 'TRG'
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@syncflow.com',
        password: await bcrypt.hash('user123', 12),
        role: 'user',
        empId: 'EMP003',
        designation: 'UI/UX Designer',
        vertex: 'LOF'
      },
      {
        name: 'Mike Chen',
        email: 'mike.chen@syncflow.com',
        password: await bcrypt.hash('user123', 12),
        role: 'user',
        empId: 'EMP004',
        designation: 'QA Engineer',
        vertex: 'CMIS'
      },
      {
        name: 'Client Demo',
        email: 'client@demo.com',
        password: await bcrypt.hash('client123', 12),
        role: 'client',
        designation: 'Project Manager',
        vertex: 'TRG'
      }
    ];

    console.log('👥 Creating sample users...');
    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created user: ${userData.name} (${userData.email})`);
      } else {
        console.log(`ℹ️  User already exists: ${userData.name}`);
      }
    }

    // Create indexes for better performance
    console.log('🔧 Creating database indexes...');
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ empId: 1 }, { unique: true, sparse: true });
    await User.collection.createIndex({ role: 1 });
    await User.collection.createIndex({ vertex: 1 });
    await User.collection.createIndex({ isActive: 1 });

    console.log('✅ Database initialization completed successfully!');
    console.log('');
    console.log('🎯 Default Login Credentials:');
    console.log('   Admin: admin@syncflow.com / admin123');
    console.log('   User: john.smith@syncflow.com / user123');
    console.log('   Client: client@demo.com / client123');
    console.log('');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await initializeData();
    console.log('🎉 All done! Database is ready to use.');
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the script
if (require.main === module) {
  main();
}

module.exports = { connectDB, initializeData };