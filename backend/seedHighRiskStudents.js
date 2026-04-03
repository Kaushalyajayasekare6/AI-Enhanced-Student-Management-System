import mongoose from 'mongoose';
import Student from './models/studentModel.js';
const Marks = require('./models/Marks');
const Attendance = require('./models/Attendance');
const ClassTeacher = require('./models/ClassTeacher');

async function seedHighRiskStudents() {
  try {
    await mongoose.connect('mongodb://localhost:27017/schoolDB');
    
    // Find a teacher class assignment
    const assignment = await ClassTeacher.findOne({}).populate('teacherId');
    if (!assignment) {
      console.log('No class teacher assignment found');
      return;
    }
    
    const grade = assignment.grade;
    const section = assignment.section;
    
    console.log(`Adding high-risk students to ${grade}${section}`);
    
    // Add 2 high risk students
    const highRiskStudents = [
      {
        firstName: 'Risky',
        lastName: 'Student1',
        enrollmentNo: 'HIGH001',
        grade,
        section,
        terms: [{
          year: 2026,
          term: 1,
          marks: {
            english: 25,
            sinhala: 20,
            maths: 18,
            science: 22,
            religion: 30
          }
        }],
        fatherContact: '0771234567',
        motherContact: '0771234568'
      },
      {
        firstName: 'Danger',
        lastName: 'Student2',
        enrollmentNo: 'HIGH002',
        grade,
        section,
        terms: [{
          year: 2026,
          term: 1,
          marks: {
            english: 15,
            sinhala: 12,
            maths: 10,
            science: 8,
            religion: 20
          }
        }],
        fatherContact: '0777654321',
        motherContact: '0778765432'
      }
    ];
    
    for (const studentData of highRiskStudents) {
      let student = await Student.findOne({ enrollmentNo: studentData.enrollmentNo });
      if (!student) {
        student = new Student(studentData);
        await student.save();
        console.log(`Added high-risk student: ${studentData.enrollmentNo}`);
        
        // Add low attendance records
        const lowAttendanceDays = 20;
        for (let i = 0; i < lowAttendanceDays; i++) {
          const date = new Date(2026, 2, i + 1); // March 2026
          const attendance = new Attendance({
            studentId: student._id,
            date: date.toISOString().split('T')[0],
            status: 'A'
          });
          await attendance.save();
        }
        
        console.log(`Added low attendance for ${studentData.enrollmentNo}`);
      }
    }
    
    console.log('✅ High-risk students seeded successfully!');
  } catch (error) {
    console.error('Error seeding high-risk students:', error);
  } finally {
    mongoose.connection.close();
  }
}

seedHighRiskStudents();

