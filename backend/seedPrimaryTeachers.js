import mongoose from "mongoose";
import dotenv from "dotenv";
import Teacher from "./models/teacherModel.js";
import User from "./models/User.js";
import ClassTeacher from "./models/ClassTeacher.js";

dotenv.config();

const GRADES = [1, 2, 3, 4, 5];
const SECTIONS = ["A", "B", "C", "D"];

const CLASS_SUBJECTS = ["Sinhala", "Maths", "EVS", "Religion", "Art"];
const ENGLISH_SUBJECTS = ["English"];

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
    console.log("Connected to MongoDB");

    let englishCount = 0;
    let classTeacherCount = 0;
    let mappedCount = 0;

    for (const grade of GRADES) {
      for (const section of SECTIONS) {
        const classKey = `${grade}${section}`;

        const englishUsername = `eng_g${grade}${section}@school.com`;
        const classUsername = `class_g${grade}${section}@school.com`;

        const englishTeacher = await upsertTeacherWithUser({
          username: englishUsername,
          firstName: `English${classKey}`,
          lastName: "Teacher",
          subjects: ENGLISH_SUBJECTS,
          classRange: "1-5",
        });
        englishCount += 1;

        const classTeacher = await upsertTeacherWithUser({
          username: classUsername,
          firstName: `Class${classKey}`,
          lastName: "Teacher",
          subjects: CLASS_SUBJECTS,
          classRange: "1-5",
        });
        classTeacherCount += 1;

        await ClassTeacher.findOneAndUpdate(
          { grade, section, stream: null },
          { teacherId: classTeacher._id, grade, section, stream: null },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        mappedCount += 1;
      }
    }

    console.log("Seed complete");
    console.log(`English teachers ensured: ${englishCount}`);
    console.log(`Class teachers ensured: ${classTeacherCount}`);
    console.log(`Class mappings ensured: ${mappedCount}`);
    console.log("Default teacher login password: teacher123");
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
