import mongoose from "mongoose";
import dotenv from "dotenv";
import Teacher from "./models/teacherModel.js";
import User from "./models/User.js";
import ClassTeacher from "./models/ClassTeacher.js";

dotenv.config();

const GRADES = [1, 2, 3, 4, 5];
const SECTIONS = ["A", "B", "C", "D"];

const CLASS_SUBJECTS = ["Sinhala", "Maths", "EVS", "Religion", "Art"];

const ensureTeacherAndLogin = async ({
  username,
  firstName,
  lastName,
  subjects,
  classRange,
  password = "teacher123",
}) => {
  let teacher = await Teacher.findOne({ username });
  if (!teacher) {
    teacher = await Teacher.create({
      firstName,
      lastName,
      username,
      email: username,
      subjects,
      classRange,
      enrollmentDate: "2026-01-01",
      leaveDate: "",
    });
  } else {
    teacher.firstName = firstName;
    teacher.lastName = lastName;
    teacher.email = username;
    teacher.subjects = subjects;
    teacher.classRange = classRange;
    teacher.leaveDate = "";
    await teacher.save();
  }

  const existingUser = await User.findOne({ username, role: "teacher" });
  if (!existingUser) {
    await User.create({
      username,
      password,
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
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    let classTeacherCount = 0;
    let classMappingCount = 0;
    let englishTeacherCount = 0;

    // 20 class teachers (one per class 1-5 A-D)
    for (const grade of GRADES) {
      for (const section of SECTIONS) {
        const key = `${grade}${section}`;
        const classTeacher = await ensureTeacherAndLogin({
          username: `class_g${grade}${section}@school.com`,
          firstName: `Class${key}`,
          lastName: "Teacher",
          subjects: CLASS_SUBJECTS,
          classRange: "1-5",
        });
        classTeacherCount += 1;

        await ClassTeacher.findOneAndUpdate(
          { grade, section, stream: null },
          { grade, section, stream: null, teacherId: classTeacher._id },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        classMappingCount += 1;
      }
    }

    // 6 English teachers (shared pool for primary)
    for (let i = 1; i <= 6; i += 1) {
      await ensureTeacherAndLogin({
        username: `eng_primary${i}@school.com`,
        firstName: `EnglishPrimary${i}`,
        lastName: "Teacher",
        subjects: ["English"],
        classRange: "1-5",
      });
      englishTeacherCount += 1;
    }

    console.log("Seed complete");
    console.log(`Class teachers ensured (1-5 A-D): ${classTeacherCount}`);
    console.log(`Class mappings ensured (1-5 A-D): ${classMappingCount}`);
    console.log(`English teachers ensured: ${englishTeacherCount}`);
    console.log("Teacher login default password: teacher123");
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
