/**
 * Seed Middle School Teachers for Grades 6-9
 * Adds teachers for all missing subjects in Grades 6-9 classes
 * 
 * Run with: node seedMiddleTeachersGrade6_9.js
 */

import mongoose from 'mongoose';
import Teacher from './models/teacherModel.js';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

// Teacher subject definitions
const MIDDLE_TEACHERS = [
  // Core Subjects (1 teacher per subject)
  {
    firstName: 'Tamil',
    lastName: 'Teacher',
    subjects: ['Tamil'],
    email: 'tamil.teacher@school.com',
    phone: '+94711234501',
    gender: 'Female',
    classRange: 'Grades 6-9',
  },
  {
    firstName: 'History',
    lastName: 'Teacher',
    subjects: ['History'],
    email: 'history.teacher@school.com',
    phone: '+94711234502',
    gender: 'Male',
    classRange: 'Grades 6-9',
  },
  {
    firstName: 'Geography',
    lastName: 'Teacher',
    subjects: ['Geography'],
    email: 'geography.teacher@school.com',
    phone: '+94711234503',
    gender: 'Female',
    classRange: 'Grades 6-9',
  },
  {
    firstName: 'Religion',
    lastName: 'Teacher',
    subjects: ['Buddhism', 'Hinduism', 'Islam', 'Catholicism', 'Christianity'],
    email: 'religion.teacher@school.com',
    phone: '+94711234504',
    gender: 'Male',
    classRange: 'Grades 6-9',
  },
  {
    firstName: 'Civic',
    lastName: 'Education',
    subjects: ['Civic Education', 'Citizenship', 'Civilization', 'Social Science', 'Life Competencies'],
    email: 'civic.teacher@school.com',
    phone: '+94711234505',
    gender: 'Female',
    classRange: 'Grades 6-9',
  },
  {
    firstName: 'Health',
    lastName: 'Teacher',
    subjects: ['Health'],
    email: 'health.teacher@school.com',
    phone: '+94711234506',
    gender: 'Male',
    classRange: 'Grades 6-9',
  },
  {
    firstName: 'ICT',
    lastName: 'Teacher',
    subjects: ['ICT'],
    email: 'ict.teacher@school.com',
    phone: '+94711234507',
    gender: 'Female',
    classRange: 'Grades 6-9',
  },
  {
    firstName: 'Physical',
    lastName: 'Training',
    subjects: ['PTS (Physical Training)', 'Technology'],
    email: 'pts.teacher@school.com',
    phone: '+94711234508',
    gender: 'Male',
    classRange: 'Grades 6-9',
  },
  // Aesthetic Electives (1 per section)
  {
    firstName: 'Art',
    lastName: 'Teacher',
    subjects: ['Art', 'ART'],
    email: 'art.teacher@school.com',
    phone: '+94711234509',
    gender: 'Female',
    classRange: 'Grades 6-9 (Section A)',
  },
  {
    firstName: 'Music',
    lastName: 'Teacher',
    subjects: ['Music'],
    email: 'music.teacher@school.com',
    phone: '+94711234510',
    gender: 'Male',
    classRange: 'Grades 6-9 (Section B)',
  },
  {
    firstName: 'Dancing',
    lastName: 'Teacher',
    subjects: ['Dancing'],
    email: 'dancing.teacher@school.com',
    phone: '+94711234511',
    gender: 'Female',
    classRange: 'Grades 6-9 (Section C)',
  },
  {
    firstName: 'Drama',
    lastName: 'Teacher',
    subjects: ['Drama and Theatre'],
    email: 'drama.teacher@school.com',
    phone: '+94711234512',
    gender: 'Male',
    classRange: 'Grades 6-9 (Section D)',
  },
];

const seedTeachers = async () => {
  try {
    // Connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/research-db');
    console.log('✅ MongoDB connected');

    // Clear existing middle teachers to avoid duplicates
    const result = await Teacher.deleteMany({
      email: { $in: MIDDLE_TEACHERS.map(t => t.email) }
    });
    console.log(`🗑️  Deleted ${result.deletedCount} existing teachers`);

    // Insert new teachers
    let createdCount = 0;
    for (const teacherData of MIDDLE_TEACHERS) {
      // Generate username from email
      const username = teacherData.email.split('@')[0];
      
      // Create teacher
      const teacher = new Teacher({
        ...teacherData,
        username,
        password: 'Temp@123', // Temporary password - should be changed
        gender: teacherData.gender || 'Not specified',
        address: 'School Address',
        location: 'Sri Lanka',
        district: 'Colombo',
        enrollmentDate: new Date().toISOString().split('T')[0],
      });

      const savedTeacher = await teacher.save();

      // Create User account for the teacher
      const user = new User({
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        email: teacherData.email,
        username,
        password: 'Temp@123', // Same temporary password
        role: 'teacher',
        userId: savedTeacher._id,
      });

      await user.save();
      createdCount++;

      console.log(`✅ Created teacher: ${teacherData.firstName} ${teacherData.lastName}`);
      console.log(`   Subjects: ${teacherData.subjects.join(', ')}`);
      console.log(`   Email: ${teacherData.email}\n`);
    }

    console.log(`\n✅ Successfully created ${createdCount} teachers for Grades 6-9`);
    console.log('\n⚠️  PASSWORD NOTICE:');
    console.log('   All teachers have temporary password: Temp@123');
    console.log('   Teachers should be asked to change their password on first login\n');

    // Display summary
    console.log('📋 TEACHERS ADDED:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Core Subjects (for all sections):');
    console.log('  • Tamil');
    console.log('  • History');
    console.log('  • Geography');
    console.log('  • Religion (handles Buddhism, Hinduism, Islam, etc.)');
    console.log('  • Civic Education');
    console.log('  • Health');
    console.log('  • ICT');
    console.log('  • PTS (Physical Training)\n');
    console.log('Aesthetic Electives (section-specific):');
    console.log('  • Art (Section A)');
    console.log('  • Music (Section B)');
    console.log('  • Dancing (Section C)');
    console.log('  • Drama and Theatre (Section D)\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding teachers:', err);
    process.exit(1);
  }
};

seedTeachers();
