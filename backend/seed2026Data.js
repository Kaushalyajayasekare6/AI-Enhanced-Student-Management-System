import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./models/studentModel.js";
import Attendance from "./models/Attendance.js";
import Marks from "./models/Marks.js";
import Teacher from "./models/teacherModel.js";
import ClassTeacher from "./models/ClassTeacher.js";
import SchoolDay from "./models/SchoolDay.js";

dotenv.config();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomMark = (base = 70, variance = 20) => {
  const mark = base + randomInt(-variance, variance);
  return Math.max(0, Math.min(100, mark));
};

const randomAttendanceStatus = () => {
  const roll = Math.random();
  if (roll < 0.85) return "P";  // 85% Present
  if (roll < 0.95) return "L";  // 10% Late
  return "A";  // 5% Absent
};

const parseGrade = (gradeValue) => {
  const match = String(gradeValue || "").match(/(\d+)/);
  return match ? Number(match[0]) : 1;
};

const getSubjectsForGrade = (grade) => {
  // Primary subjects for grades 1-5
  const baseMarks = {
    english: randomMark(75, 15),
    maths: randomMark(72, 18),
    science: randomMark(70, 20),
    sinhala: randomMark(78, 12),
    tamil: randomMark(75, 15),
    religion: randomMark(80, 10),
    assignmentPercentage: randomInt(60, 95),
  };

  // Add environmental studies for grades 3-5
  if (grade >= 3) {
    baseMarks.environment = randomMark(73, 17);
  }

  return baseMarks;
};

const SRI_LANKA_HOLIDAYS_2026 = [
  "2026-01-14", // Thai Pongal
  "2026-02-04", // Independence Day
  "2026-04-13", // Sinhala/Tamil New Year Eve
  "2026-04-14", // New Year Day
  "2026-05-01", // Labour Day
  "2026-05-22", // Vesak Poya
  "2026-06-01", // Poson Poya
  "2026-12-25", // Christmas
];

const isHoliday = (dateStr) => {
  return SRI_LANKA_HOLIDAYS_2026.includes(dateStr);
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
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

    console.log(`📊 Processing ${students.length} students for 2026 data...`);

    // === ATTENDANCE DATA FOR 2026 ===
    console.log("📅 Adding attendance data for 2026...");

    const currentYear = 2026;
    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(`${currentYear}-03-31`); // Until March 31st

    let attendanceRecords = 0;
    const attendanceOps = [];

    for (const student of students) {
      const studentId = student._id;

      // Check existing attendance to avoid duplicates
      const existingAttendance = await Attendance.find({
        studentId,
        date: { $gte: startDate, $lte: endDate }
      });

      const existingDates = new Set(
        existingAttendance.map(a => a.date.toISOString().split('T')[0])
      );

      // Generate attendance for each day
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];

        // Skip if already exists or is holiday/weekend
        if (existingDates.has(dateStr) || isHoliday(dateStr) || isWeekend(date)) {
          continue;
        }

        const status = randomAttendanceStatus();

        attendanceOps.push({
          updateOne: {
            filter: { studentId, date: new Date(dateStr) },
            update: {
              studentId,
              date: new Date(dateStr),
              status,
              grade: student.grade,
              section: student.section,
            },
            upsert: true,
          },
        });

        attendanceRecords++;
      }
    }

    if (attendanceOps.length > 0) {
      const result = await Attendance.bulkWrite(attendanceOps, { ordered: false });
      console.log(`✅ Added ${result.upsertedCount + result.modifiedCount} attendance records`);
    } else {
      console.log("ℹ️ No new attendance records needed");
    }

    // === MARKS DATA FOR 2026 ===
    console.log("📝 Adding marks data for 2026...");

    let marksUpdated = 0;
    const marksOps = [];
    const studentOps = [];

    for (const student of students) {
      const grade = parseGrade(student.grade);
      const section = String(student.section || "").toUpperCase();
      const teacherId = classTeacherMap.get(`${grade}-${section}`) || fallbackTeacher._id;

      const existingTerms = Array.isArray(student.terms) ? student.terms : [];
      const targetTerms = existingTerms.filter(t => !(Number(t.year) === currentYear));

      // Add marks for all 3 terms in 2026
      for (let term = 1; term <= 3; term++) {
        const marks = getSubjectsForGrade(grade);

        // Check if marks already exist
        const existingMarks = await Marks.findOne({
          studentId: student._id,
          year: currentYear,
          term
        });

        if (!existingMarks) {
          marksOps.push({
            updateOne: {
              filter: { studentId: student._id, year: currentYear, term },
              update: {
                $set: {
                  studentId: student._id,
                  teacherId,
                  year: currentYear,
                  term,
                  marks,
                  gradeLevel: "1-5",
                },
              },
              upsert: true,
            },
          });
          marksUpdated++;
        }

        // Update student terms array
        const existingTermIndex = targetTerms.findIndex((t) => Number(t.term) === term && Number(t.year) === currentYear);
        if (existingTermIndex > -1) {
          targetTerms[existingTermIndex].marks = { ...targetTerms[existingTermIndex].marks, ...marks };
        } else {
          targetTerms.push({ year: currentYear, term, marks });
        }
      }

      studentOps.push({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { terms: targetTerms } },
        },
      });
    }

    if (marksOps.length > 0) {
      const result = await Marks.bulkWrite(marksOps, { ordered: false });
      console.log(`✅ Added ${result.upsertedCount + result.modifiedCount} marks records`);
    } else {
      console.log("ℹ️ No new marks records needed");
    }

    if (studentOps.length > 0) {
      await Student.bulkWrite(studentOps, { ordered: false });
      console.log(`✅ Updated ${studentOps.length} student term records`);
    }

    console.log("🎉 2026 data seeding completed successfully!");
    console.log(`📊 Summary:`);
    console.log(`   - Students processed: ${students.length}`);
    console.log(`   - Attendance records: ${attendanceRecords}`);
    console.log(`   - Marks records: ${marksUpdated}`);

  } catch (error) {
    console.error("❌ Error seeding 2026 data:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
};

run();