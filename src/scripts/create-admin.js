const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Database connection
const connectToDatabase = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncflow';
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

// User Schema (simplified version)
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user', 'client'], default: 'user' },
  empId: { type: String, sparse: true },
  designation: { type: String },
  vertex: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function createAdminUser() {
  try {
    await connectToDatabase();

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@syncflow.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@syncflow.com',
      password: 'admin123', // This will be hashed automatically
      role: 'admin',
      empId: 'ADMIN001',
      designation: 'System Administrator',
      isActive: true
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@syncflow.com');
    console.log('Password: admin123');

    // Create a test user
    const testUser = new User({
      name: 'Test User',
      email: 'user@syncflow.com',
      password: 'user123', // This will be hashed automatically
      role: 'user',
      empId: 'USER001',
      designation: 'Test Employee',
      isActive: true
    });

    await testUser.save();
    console.log('Test user created successfully!');
    console.log('Email: user@syncflow.com');
    console.log('Password: user123');

    // Create a test client
    const testClient = new User({
      name: 'Test Client',
      email: 'client@syncflow.com',
      password: 'client123', // This will be hashed automatically
      role: 'client',
      vertex: 'CMIS',
      designation: 'Test Client',
      isActive: true
    });

    await testClient.save();
    console.log('Test client created successfully!');
    console.log('Email: client@syncflow.com');
    console.log('Password: client123');
    console.log('Vertex: CMIS');

    process.exit(0);
  } catch (error) {
    console.error('Error creating users:', error);
    process.exit(1);
  }
}

createAdminUser();