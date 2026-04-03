import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./models/studentModel.js";
import Marks from "./models/Marks.js";
import Teacher from "./models/teacherModel.js";
import ClassTeacher from "./models/ClassTeacher.js";

dotenv.config();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomMark = () => randomInt(45, 98);

const parseGrade = (gradeValue) => {
  const match = String(gradeValue || "").match(/\\d+/);
  return match ? Number(match[0]) : 1;
};

const getSubjectsForGrade = (grade) => {
  // For grades 1-5 as per seedAcademicData.js
  return {
    english: randomMark(),
    sinhala: randomMark(),
    maths: randomMark(),
    science: randomMark(),
    religion: randomMark(),
    assignmentPercentage: randomInt(40, 100),
  };
};

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🟢 Connected to MongoDB");

    const students = await Student.find({});
    if (!students.length) {
      console.log("❌ No students found.");
      return;
    }

    const classTeacherRows = await ClassTeacher.find({});
    const classTeacherMap = new Map(
      classTeacherRows.map((row) => [`${row.grade}-${String(row.section).toUpperCase()}`, row.teacherId])
    );
    const fallbackTeacher = await Teacher.findOne();
    if (!fallbackTeacher) throw new Error("❌ No teacher found");

    const previousYear = 2025; // Previous terms
    let marksUpdated = 0;
    let studentTermsUpdated = 0;
    const marksOps = [];
    const studentOps = [];

    for (const student of students) {
      const grade = parseGrade(student.grade);
      const section = String(student.section || "").toUpperCase();
      const teacherId = classTeacherMap.get(`${grade}-${section}`) || fallbackTeacher._id;

      const existingTerms = Array.isArray(student.terms) ? student.terms : [];
      const targetTerms = existingTerms.filter(t => !(Number(t.year) === previousYear));

      for (let term = 1; term <= 3; term += 1) {
        const existingTermIndex = targetTerms.findIndex((t) => Number(t.term) === term);
        const marks = getSubjectsForGrade(grade);

        if (existingTermIndex > -1) {
          // Merge with existing
          targetTerms[existingTermIndex].marks = { ...targetTerms[existingTermIndex].marks, ...marks };
        } else {
          targetTerms.push({ year: previousYear, term, marks });
        }

        marksOps.push({
          updateOne: {
            filter: { studentId: student._id, year: previousYear, term },
            update: {
              $set: {
                studentId: student._id,
                teacherId,
                year: previousYear,
                term,
                marks,
                gradeLevel: "1-5",
              },
            },
            upsert: true,
          },
        });
        marksUpdated += 1;
      }

      studentOps.push({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { terms: targetTerms } },
        },
      });
      studentTermsUpdated += 1;
    }

    if (marksOps.length) await Marks.bulkWrite(marksOps);
    if (studentOps.length) await Student.bulkWrite(studentOps);

    console.log("✅ Previous year marks seeding completed!");
    console.log(`📊 Marks records upserted: ${marksUpdated}`);
    console.log(`📚 Student terms updated: ${studentTermsUpdated}`);
  } catch (error) {
    console.error("❌ Failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();

