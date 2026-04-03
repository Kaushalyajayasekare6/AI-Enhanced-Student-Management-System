import mongoose from "mongoose";
import dotenv from "dotenv";
import Student from "./models/studentModel.js";
import User from "./models/User.js";
import Teacher from "./models/teacherModel.js";
import ClassTeacher from "./models/ClassTeacher.js";
import Attendance from "./models/Attendance.js";
import SchoolDay from "./models/SchoolDay.js";
import Marks from "./models/Marks.js";

dotenv.config();

const GRADES_6_9 = [6, 7, 8, 9];
const SECTIONS = ["A", "B", "C", "D"];
const SUBJECTS_6_9_MARKS = {
  english: 0, sinhala: 0, maths: 0, science: 0, religious: 0, art: 0,
  geography: 0, citizenship: 0, tamil: 0, pts: 0, health: 0, history: 0,
  assignmentPercentage: 0
};
const ATTENDANCE_DAYS = 10;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (num, size = 2) => String(num).padStart(size, "0");
const toDateStr = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const firstNames = [
  "Kasun", "Nimal", "Sahan", "Ravindu", "Kavindu", "Dilshan", "Tharushi", "Nethmi",
  "Sewwandi", "Piumi", "Hashini", "Sanduni", "Kanishka", "Yasiru", "Ayesh", "Sachini",
  "Lahiru", "Amaya", "Ishara", "Dinesh", "Kalani", "Navoda", "Vihanga", "Chamodi",
];
const lastNames = [
  "Perera", "Silva", "Fernando", "Jayasinghe", "Bandara", "Gunawardena", "Mendis",
  "Samarasinghe", "Rathnayake", "Wijesinghe", "Lakmal", "Abeysekara",
];

const pick = (arr) => arr[randomInt(0, arr.length - 1)];

const buildStudentPayload = (sequence, grade, section) => {
  const enrollmentNo = `ST${pad(5000 + sequence, 5)}`; // Start from higher numbers to avoid primary overlap
  const firstName = pick(firstNames);
  const lastName = pick(lastNames);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  const dobYear = 2013 + Math.max(0, 5 - grade); // Adjust age appropriately
  const dob = `${dobYear}-${pad(month)}-${pad(day)}`;
  const gender = Math.random() > 0.5 ? "Male" : "Female";
  const fatherFirst = pick(firstNames);
  const motherFirst = pick(firstNames);

  return {
    enrollmentNo,
    firstName,
    lastName,
    gender,
    dob,
    grade: `Grade ${grade}`,
    section,
    stream: "",
    term: "Term 1",
    contactNumber: `07${randomInt(10000000, 99999999)}`,
    address: `${randomInt(1, 250)}, Main Street, Nuwara Eliya`,
    district: "Nuwara Eliya",
    pincode: "22200",
    username: `${enrollmentNo.toLowerCase()}@gmail.com`,
    password: enrollmentNo,
    fatherName: `${fatherFirst} ${lastName}`,
    fatherContact: `07${randomInt(10000000, 99999999)}`,
    motherName: `${motherFirst} ${lastName}`,
    motherContact: `07${randomInt(10000000, 99999999)}`,
    bcNumber: `BC${pad(5000 + sequence, 5)}`,
    enrollmentDate: `${new Date().getFullYear()}-01-10`,
    leaveDate: "",
    terms: [],
  };
};

const markForSubject = () => randomInt(45, 98);
const randomAttendanceStatus = () => {
  const roll = Math.random();
  if (roll < 0.83) return "P";
  if (roll < 0.95) return "L";
  return "A";
};

const getRecentWeekdays = (count) => {
  const days = [];
  const cursor = new Date();
  while (days.length < count) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return days.reverse();
};

const run = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB - Seeding Middle School Students");

    const currentYear = new Date().getFullYear();
    const weekdays = getRecentWeekdays(ATTENDANCE_DAYS);

    const students = [];
    const allStudentPayloads = [];
    let sequence = 1;
    for (const grade of GRADES_6_9) {
      for (const section of SECTIONS) {
        for (let i = 0; i < 20; i += 1) {
          const payload = buildStudentPayload(sequence, grade, section);
          sequence += 1;
          allStudentPayloads.push(payload);
        }
      }
    }

    // Upsert students
    const studentOps = allStudentPayloads.map((payload) => ({
      updateOne: {
        filter: { enrollmentNo: payload.enrollmentNo },
        update: { $set: payload },
        upsert: true,
      },
    }));
    await Student.bulkWrite(studentOps);

    // Fetch created students
    const enrollmentNos = allStudentPayloads.map((p) => p.enrollmentNo);
    const studentRows = await Student.find({ enrollmentNo: { $in: enrollmentNos } });
    const studentByEnroll = new Map(studentRows.map((s) => [s.enrollmentNo, s]));
    allStudentPayloads.forEach((payload) => {
      const row = studentByEnroll.get(payload.enrollmentNo);
      if (row) students.push(row);
    });

    // Create student users
    const existingStudentUsers = await User.find({ role: "student", username: { $in: students.map((s) => s.username) } });
    const existingUsernames = new Set(existingStudentUsers.map((u) => u.username));
    const newUsers = students
      .filter((s) => !existingUsernames.has(s.username))
      .map((s) => ({
        username: s.username,
        password: s.password,
        role: "student",
        userId: s._id,
      }));
    if (newUsers.length) {
      await User.insertMany(newUsers);
    }

    // Get class teachers for 6-9
    const classTeacherMap = new Map();
    const classTeacherRows = await ClassTeacher.find({
      grade: { $in: GRADES_6_9 },
      section: { $in: SECTIONS },
    });
    classTeacherRows.forEach((row) => classTeacherMap.set(`${row.grade}-${row.section}`, row.teacherId));

    let fallbackTeacher = await Teacher.findOne({ classRange: "6-9" });
    if (!fallbackTeacher) {
      fallbackTeacher = await Teacher.findOne();
    }
    if (!fallbackTeacher) {
      throw new Error("No teachers found. Run seedMiddleTeachers.js first.");
    }

    // Generate marks, attendance, terms
    let marksCount = 0;
    let attendanceCount = 0;
    const marksOps = [];
    const attendanceOps = [];
    const studentTermOps = [];
    const schoolDayOps = [];
    const seenSchoolDay = new Set();

    for (const student of students) {
      const grade = Number((student.grade || "").replace(/\D/g, "")) || 6;
      const section = String(student.section || "").toUpperCase();
      const teacherId = classTeacherMap.get(`${grade}-${section}`) || fallbackTeacher._id;

      const termEntries = [];

      for (let term = 1; term <= 3; term += 1) {
        const marks = { ...SUBJECTS_6_9_MARKS };
        Object.keys(marks).forEach(key => {
          if (key !== 'assignmentPercentage') {
            marks[key] = markForSubject();
          } else {
            marks[key] = randomInt(40, 100);
          }
        });

        termEntries.push({ year: currentYear, term, marks });
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
                gradeLevel: "6-9",
              },
            },
            upsert: true,
          },
        });
        marksCount += 1;
      }
      studentTermOps.push({
        updateOne: {
          filter: { _id: student._id },
          update: { $set: { terms: termEntries } },
        },
      });

      for (const day of weekdays) {
        const date = toDateStr(day);
        if (!seenSchoolDay.has(date)) {
          schoolDayOps.push({
            updateOne: {
              filter: { date },
              update: { $set: { date, isSchoolDay: true, description: "" } },
              upsert: true,
            },
          });
          seenSchoolDay.add(date);
        }

        attendanceOps.push({
          updateOne: {
            filter: { studentId: student._id, date },
            update: { $set: { studentId: student._id, teacherId, date, status: randomAttendanceStatus() } },
            upsert: true,
          },
        });
        attendanceCount += 1;
      }
    }

    if (marksOps.length) await Marks.bulkWrite(marksOps);
    if (studentTermOps.length) await Student.bulkWrite(studentTermOps);
    if (schoolDayOps.length) await SchoolDay.bulkWrite(schoolDayOps);
    if (attendanceOps.length) await Attendance.bulkWrite(attendanceOps);

    // Ensure at least two explicit high-risk students are present in each grade 6-9 section
    const addHighRiskStudent = async (grade, section, idx) => {
      const enrollmentNo = `SHR${grade}${section}${idx}`;
      const studentPayload = {
        enrollmentNo,
        firstName: `HighRisk${idx}`,
        lastName: `G${grade}${section}`,
        gender: idx % 2 === 0 ? "Male" : "Female",
        dob: `${new Date().getFullYear() - 14}-01-01`,
        grade: `Grade ${grade}`,
        section,
        stream: "",
        term: "Term 1",
        contactNumber: `071${randomInt(10000000, 99999999)}`,
        address: `High risk student for Grade ${grade} Section ${section}`,
        district: "Colombo",
        pincode: "00000",
        username: `${enrollmentNo.toLowerCase()}@example.com`, 
        password: "highrisk",
        fatherName: `Father${idx}`,
        fatherContact: `072${randomInt(10000000, 99999999)}`,
        motherName: `Mother${idx}`,
        motherContact: `073${randomInt(10000000, 99999999)}`,
        bcNumber: `BCHR${grade}${section}${idx}`,
        enrollmentDate: `${new Date().getFullYear()}-01-01`,
        leaveDate: "",
        terms: [{
          year: currentYear,
          term: 1,
          marks: {
            english: 10,
            sinhala: 12,
            maths: 14,
            science: 9,
            religious: 10,
            art: 11,
            geography: 10,
            citizenship: 12,
            tamil: 8,
            pts: 10,
            health: 9,
            history: 10,
            assignmentPercentage: 10,
          },
        }],
      };

      await Student.updateOne({ enrollmentNo }, { $set: studentPayload }, { upsert: true });
      const student = await Student.findOne({ enrollmentNo });
      if (!student) return;
      await User.updateOne(
        { username: studentPayload.username },
        { $set: { username: studentPayload.username, password: studentPayload.password, role: "student", userId: student._id } },
        { upsert: true }
      );
      await Marks.updateOne(
        { studentId: student._id, year: currentYear, term: 1 },
        { $set: { studentId: student._id, teacherId: null, year: currentYear, term: 1, marks: studentPayload.terms[0].marks, gradeLevel: "6-9" } },
        { upsert: true }
      );
      for (const day of weekdays) {
        await Attendance.updateOne(
          { studentId: student._id, date: toDateStr(day) },
          { $set: { studentId: student._id, teacherId: null, date: toDateStr(day), status: "A" } },
          { upsert: true }
        );
      }
    };

    let added = 0;
    for (const grade of GRADES) {
      for (const section of SECTIONS) {
        for (let i = 1; i <= 2; i++) {
          await addHighRiskStudent(grade, section, i);
          added += 1;
        }
      }
    }

    console.log("✅ Middle School Student Seed completed successfully!");
    console.log(`👨‍🎓 Students ensured: ${students.length + added}`);
    console.log(`📊 Marks records ensured: ${marksCount + added}`);
    console.log(`📋 Attendance records ensured: ${attendanceCount + added * weekdays.length}`);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();

