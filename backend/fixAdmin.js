import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

async function fixAdmin() {
  try {
    // Connect to MongoDB using your MONGODB_URI from .env file
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Delete existing admin if exists
    const deleted = await User.deleteOne({ username: 'admin@gmail.com' });
    console.log(deleted.deletedCount ? '🗑️  Deleted existing admin' : 'No existing admin found');

    // Create new admin using the User model
    const admin = new User({
      username: 'admin@gmail.com',
      password: 'admin123', // This will be hashed automatically
      role: 'admin'
    });

    await admin.save();
    
    console.log('\n✅ NEW ADMIN CREATED SUCCESSFULLY!');
    console.log('====================================');
    console.log('Email: admin@gmail.com');
    console.log('Password: admin123');
    console.log('Role: admin');
    console.log('====================================\n');

    // Show the created admin
    const createdAdmin = await User.findOne({ username: 'admin@gmail.com' });
    console.log('Admin in database:', {
      username: createdAdmin.username,
      role: createdAdmin.role,
      passwordLength: createdAdmin.password.length,
      passwordFirst30: createdAdmin.password.substring(0, 30) + '...'
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixAdmin();