import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./models/studentModel.js";
import Attendance from "./models/Attendance.js";
import Teacher from "./models/teacherModel.js";
import ClassTeacher from "./models/ClassTeacher.js";
import SchoolDay from "./models/SchoolDay.js";

dotenv.config();

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomAttendanceStatus = () => {
  const roll = Math.random();
  if (roll < 0.83) return "P";  // 83% Present
  if (roll < 0.95) return "L";  // 12% Late
  return "A";  // 5% Absent
};
const toDateStr = (date) => {
  const pad = (num, size = 2) => String(num).padStart(size, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const SRI_LANKA_HOLIDAYS_2026 = [
  "2026-01-14", // Thai Pongal
  "2026-02-04", // Independence Day
  "2026-04-13", // Sinhala/Tamil New Year Eve
  "2026-04-14", // New Year Day
  "2026-05-01", // Labour Day
  "2026-05-22", // Vesak Poya
  "2026-06-01", // Poson Poya approx
  "2026-12-25", // Christmas
];

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🟢 Connected to MongoDB");

    const currentYear = 2026;
    const startDate = new Date(`${currentYear}-01-01`);
    const endDate = new Date(); // Up to today

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

    // Generate/ensure school days (Mon-Fri except holidays)
    const schoolDays = [];
    let current = new Date(startDate);
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      const dateStr = toDateStr(current);
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !SRI_LANKA_HOLIDAYS_2026.includes(dateStr)) {
        // Upsert school day
        await SchoolDay.findOneAndUpdate(
          { date: dateStr },
          { date: dateStr, isSchoolDay: true, description: "" },
          { upsert: true }
        );
        schoolDays.push(dateStr);
      } else if (SRI_LANKA_HOLIDAYS_2026.includes(dateStr)) {
        // Mark holidays
        await SchoolDay.findOneAndUpdate(
          { date: dateStr },
          { date: dateStr, isSchoolDay: false, description: "Public Holiday" },
          { upsert: true }
        );
      }
      current.setDate(current.getDate() + 1);
    }

    // Bulk attendance for all students + school days
    let attendanceCount = 0;
    const attendanceOps = [];
    for (const student of students) {
      const grade = parseInt(student.grade.match(/\\d+/)?.[0] || "1");
      const section = String(student.section || "").toUpperCase();
      const teacherId = classTeacherMap.get(`${grade}-${section}`) || fallbackTeacher._id;

      for (const date of schoolDays) {
        attendanceOps.push({
          updateOne: {
            filter: { studentId: student._id, date },
            update: {
              $set: {
                studentId: student._id,
                teacherId,
                date,
                status: randomAttendanceStatus(),
              },
            },
            upsert: true,
          },
        });
        attendanceCount += 1;

        // Batch to avoid memory issues (100k+ ops)
        if (attendanceOps.length >= 10000) {
          await Attendance.bulkWrite(attendanceOps);
          attendanceOps.length = 0;
          console.log(`⏳ Processed ${attendanceCount} attendance records...`);
        }
      }
    }

    if (attendanceOps.length) await Attendance.bulkWrite(attendanceOps);

    console.log("✅ Full year 2026 attendance seeding completed!");
    console.log(`📊 School days generated: ${schoolDays.length}`);
    console.log(`📚 Attendance records upserted: ${attendanceCount}`);
    console.log(`👨‍🎓 Students: ${students.length}`);
  } catch (error) {
    console.error("❌ Failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
