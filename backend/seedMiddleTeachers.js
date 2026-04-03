import mongoose from "mongoose";
import dotenv from "dotenv";
import Teacher from "./models/teacherModel.js";
import User from "./models/User.js";

dotenv.config();

const GRADES_6_9 = [6, 7, 8, 9];
const SECTIONS = ["A", "B", "C", "D"];

const SUBJECTS_6_9 = [
  "English", "Sinhala", "Maths", "Science", "Religious", 
  "Art", "Geography", "Citizenship", "Tamil", "PTS", 
  "Health", "History"
];

const upsertTeacherWithUser = async ({
  username,
  firstName,
  lastName,
  subjects,
  classRange,
}) => {
  let teacher = await Teacher.findOne({ username });

  if (!teacher) {
    teacher = await Teacher.create({
      username,
      firstName,
      lastName,
      subjects,
      classRange,
      enrollmentDate: "2026-01-01",
      leaveDate: "",
      contactNumber: "",
      email: username,
    });
  } else {
    teacher.firstName = firstName;
    teacher.lastName = lastName;
    teacher.subjects = subjects;
    teacher.classRange = classRange;
    teacher.leaveDate = "";
    await teacher.save();
  }

  const existingUser = await User.findOne({ username, role: "teacher" });
  if (!existingUser) {
    await User.create({
      username,
      password: "teacher123",
      role: "teacher",
      userId: teacher._id,
    });
  } else if (!existingUser.userId || String(existingUser.userId) !== String(teacher._id)) {
    existingUser.userId = teacher._id;
    await existingUser.save();
  }

  return teacher;
};

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing in environment");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    let subjectTeacherCount = 0;
    let classTeacherCount = 0;
    let mappedCount = 0;

    // 8 teachers per subject (6-9)
    for (const subject of SUBJECTS_6_9) {
      for (let i = 1; i <= 8; i++) {
        const username = `${subject.toLowerCase()}${i}_g6-9@school.com`;
        const firstName = `${subject}${i}`;
        
        const teacher = await upsertTeacherWithUser({
          username,
          firstName,
          lastName: "Teacher",
          subjects: [subject],
          classRange: "6-9",
        });
        subjectTeacherCount += 1;
      }
    }

    // Also create class teachers for grades 6-9 (similar to primary)
    for (const grade of GRADES_6_9) {
      for (const section of SECTIONS) {
        const classKey = `${grade}${section}`;
        const classUsername = `class_g${grade}${section}@school.com`;

        const classTeacher = await upsertTeacherWithUser({
          username: classUsername,
          firstName: `Class${classKey}`,
          lastName: "Teacher",
          subjects: ["Class Teacher", "Sinhala", "Maths"],
          classRange: "6-9",
        });
        classTeacherCount += 1;
      }
    }

    console.log("✅ Seed complete!");
    console.log(`📚 Subject teachers (6-9): ${subjectTeacherCount} (8 per ${SUBJECTS_6_9.length} subjects)`);
    console.log(`👨‍🏫 Class teachers (6-9): ${classTeacherCount} (1 per class)`);
    console.log(`🔐 Default password: teacher123`);
    console.log(`📧 Username format: subject1_g6-9@school.com, class_g6A@school.com`);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();

