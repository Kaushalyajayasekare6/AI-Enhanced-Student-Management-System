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
  const match = String(gradeValue || "").match(/\d+/);
  return match ? Number(match[0]) : null;
};

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const students = await Student.find({});
    if (!students.length) {
      console.log("No students found.");
      return;
    }

    const classTeacherRows = await ClassTeacher.find({});
    const classTeacherMap = new Map(
      classTeacherRows.map((row) => [`${row.grade}-${String(row.section).toUpperCase()}`, row.teacherId])
    );
    const fallbackTeacher = await Teacher.findOne({});
    if (!fallbackTeacher) throw new Error("No teacher found to assign marks records");

    let marksUpdated = 0;
    let studentTermsUpdated = 0;
    const currentYear = new Date().getFullYear();
    const marksOps = [];
    const studentOps = [];

    for (const student of students) {
      const grade = parseGrade(student.grade);
      const section = String(student.section || "").toUpperCase();
      const teacherId = classTeacherMap.get(`${grade}-${section}`) || fallbackTeacher._id;

      const existingTerms = Array.isArray(student.terms) ? student.terms : [];
      const targetTerms = [];

      for (let term = 1; term <= 3; term += 1) {
        const studentTerm = existingTerms.find((t) => Number(t.term) === term && Number(t.year) === currentYear);
        const existingMarks = studentTerm?.marks && typeof studentTerm.marks === "object" ? studentTerm.marks : {};

        const mergedMarks = {
          ...existingMarks,
          sinhala:
            existingMarks.sinhala !== undefined && existingMarks.sinhala !== null
              ? Number(existingMarks.sinhala)
              : randomMark(),
          religion:
            existingMarks.religion !== undefined && existingMarks.religion !== null
              ? Number(existingMarks.religion)
              : randomMark(),
          assignmentPercentage:
            existingMarks.assignmentPercentage !== undefined &&
            existingMarks.assignmentPercentage !== null
              ? Number(existingMarks.assignmentPercentage)
              : randomInt(40, 100),
        };

        targetTerms.push({ year: currentYear, term, marks: mergedMarks });

        marksOps.push({
          updateOne: {
            filter: { studentId: student._id, year: currentYear, term },
            update: {
              $set: {
                studentId: student._id,
                teacherId,
                year: currentYear,
                term,
                marks: mergedMarks,
                gradeLevel: grade >= 1 && grade <= 5 ? "1-5" : grade >= 6 && grade <= 9 ? "6-9" : "10-11",
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

    console.log("Marks enhancement completed");
    console.log(`Marks records upserted: ${marksUpdated}`);
    console.log(`Student term arrays updated: ${studentTermsUpdated}`);
  } catch (error) {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
