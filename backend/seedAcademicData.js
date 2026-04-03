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

const GRADES = [1, 2, 3, 4, 5];
const SECTIONS = ["A", "B", "C", "D"];
const SUBJECTS = ["english", "maths", "science"];
const ATTENDANCE_DAYS = 10;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pad = (num, size = 2) => String(num).padStart(size, "0");
const toDateStr = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

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
  const enrollmentNo = `ST${pad(sequence, 5)}`;
  const firstName = pick(firstNames);
  const lastName = pick(lastNames);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  const dobYear = 2013 + Math.max(0, 5 - grade);
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
    username: `${enrollmentNo}@gmail.com`,
    password: enrollmentNo,
    fatherName: `${fatherFirst} ${lastName}`,
    fatherContact: `07${randomInt(10000000, 99999999)}`,
    motherName: `${motherFirst} ${lastName}`,
    motherContact: `07${randomInt(10000000, 99999999)}`,
    bcNumber: `BC${pad(sequence, 5)}`,
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
    console.log("Connected to MongoDB");

    const currentYear = new Date().getFullYear();
    const weekdays = getRecentWeekdays(ATTENDANCE_DAYS);

    const holidayEntries = [
      { date: `${currentYear}-02-04`, isSchoolDay: false, description: "Independence Day Holiday" },
      { date: `${currentYear}-04-13`, isSchoolDay: false, description: "Sinhala and Tamil New Year Eve" },
      { date: `${currentYear}-04-14`, isSchoolDay: false, description: "Sinhala and Tamil New Year Day" },
      { date: `${currentYear}-05-01`, isSchoolDay: false, description: "May Day Holiday" },
      { date: `${currentYear}-12-25`, isSchoolDay: false, description: "Christmas Holiday" },
    ];

    for (const holiday of holidayEntries) {
      await SchoolDay.findOneAndUpdate({ date: holiday.date }, holiday, { upsert: true, new: true });
    }

    const students = [];
    const allStudentPayloads = [];
    let sequence = 1;
    for (const grade of GRADES) {
      for (const section of SECTIONS) {
        for (let i = 0; i < 20; i += 1) {
          const payload = buildStudentPayload(sequence, grade, section);
          sequence += 1;
          allStudentPayloads.push(payload);
        }
      }
    }

    const studentOps = allStudentPayloads.map((payload) => ({
      updateOne: {
        filter: { enrollmentNo: payload.enrollmentNo },
        update: { $set: payload },
        upsert: true,
      },
    }));
    await Student.bulkWrite(studentOps);

    const enrollmentNos = allStudentPayloads.map((p) => p.enrollmentNo);
    const studentRows = await Student.find({ enrollmentNo: { $in: enrollmentNos } });
    const studentByEnroll = new Map(studentRows.map((s) => [s.enrollmentNo, s]));
    allStudentPayloads.forEach((payload) => {
      const row = studentByEnroll.get(payload.enrollmentNo);
      if (row) students.push(row);
    });

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

    const classTeacherMap = new Map();
    const classTeacherRows = await ClassTeacher.find({
      grade: { $gte: 1, $lte: 5 },
      section: { $in: SECTIONS },
    });
    classTeacherRows.forEach((row) => classTeacherMap.set(`${row.grade}-${row.section}`, row.teacherId));

    let fallbackTeacher = await Teacher.findOne({ classRange: "1-5" });
    if (!fallbackTeacher) {
      fallbackTeacher = await Teacher.findOne();
    }
    if (!fallbackTeacher) {
      throw new Error("No teachers found. Seed teachers first.");
    }

    let marksCount = 0;
    let attendanceCount = 0;
    const marksOps = [];
    const attendanceOps = [];
    const studentTermOps = [];
    const schoolDayOps = [];
    const seenSchoolDay = new Set();

    for (const student of students) {
      const grade = Number((student.grade || "").replace(/\D/g, "")) || 1;
      const section = String(student.section || "").toUpperCase();
      const teacherId = classTeacherMap.get(`${grade}-${section}`) || fallbackTeacher._id;

      const termEntries = [];

      for (let term = 1; term <= 3; term += 1) {
        const marks = {
          english: markForSubject(),
          sinhala: markForSubject(),
          maths: markForSubject(),
          science: markForSubject(),
          religion: markForSubject(),
          assignmentPercentage: randomInt(40, 100),
        };

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
                gradeLevel: "1-5",
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
        const isHoliday = holidayEntries.some((h) => h.date === date);
        const isSchoolDay = !isHoliday;

        if (!seenSchoolDay.has(date)) {
          schoolDayOps.push({
            updateOne: {
              filter: { date },
              update: { $set: { date, isSchoolDay, description: isHoliday ? "Holiday" : "" } },
              upsert: true,
            },
          });
          seenSchoolDay.add(date);
        }

        if (!isSchoolDay) continue;
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

    // Add explicit high-risk students for all classes (1-5)
    const addHighRiskStudent = async (grade, section, index) => {
      const suffix = `${String(grade).padStart(2, "0")}${section}${index}`;
      const enrollmentNo = `STHR${suffix}`;
      const studentData = {
        enrollmentNo,
        firstName: `HighRisk${index}`,
        lastName: `G${grade}${section}`,
        gender: index % 2 === 0 ? "Male" : "Female",
        dob: `${new Date().getFullYear() - 10 - grade}-01-01`,
        grade: `Grade ${grade}`,
        section,
        stream: "",
        term: "Term 1",
        contactNumber: `0719${randomInt(1000000, 9999999)}`,
        address: `Risk address grade ${grade} section ${section}`,
        district: "Colombo",
        pincode: "00000",
        username: `${enrollmentNo.toLowerCase()}@test.com`,
        password: "highrisk",
        fatherName: `Father ${enrollmentNo}`,
        fatherContact: `0718${randomInt(1000000, 9999999)}`,
        motherName: `Mother ${enrollmentNo}`,
        motherContact: `0717${randomInt(1000000, 9999999)}`,
        bcNumber: `BC${suffix}`,
        enrollmentDate: `${new Date().getFullYear()}-01-01`,
        leaveDate: "",
        terms: [{ year: currentYear, term: 1, marks: {
          english: 10, sinhala: 12, maths: 15, science: 9, religion: 10, assignmentPercentage: 8
        }}],
      };
      await Student.updateOne({ enrollmentNo }, { $set: studentData }, { upsert: true });
      const createdStudent = await Student.findOne({ enrollmentNo });
      if (!createdStudent) return;

      await User.updateOne(
        { username: studentData.username },
        { $set: { username: studentData.username, password: studentData.password, role: "student", userId: createdStudent._id } },
        { upsert: true }
      );

      const teacherId = classTeacherMap.get(`${grade}-${section}`) || fallbackTeacher._id;
      await Marks.updateOne(
        { studentId: createdStudent._id, year: currentYear, term: 1 },
        {
          $set: {
            studentId: createdStudent._id,
            teacherId,
            year: currentYear,
            term: 1,
            marks: studentData.terms[0].marks,
            gradeLevel: "1-5",
          },
        },
        { upsert: true }
      );

      for (const day of weekdays) {
        const date = toDateStr(day);
        const isHoliday = holidayEntries.some((h) => h.date === date);
        if (!isHoliday) {
          await Attendance.updateOne(
            { studentId: createdStudent._id, date },
            { $set: { studentId: createdStudent._id, teacherId, date, status: "A" } },
            { upsert: true }
          );
        }
      }
      return createdStudent;
    };

    let addedCount = 0;
    for (const grade of GRADES) {
      for (const section of SECTIONS) {
        for (let i = 1; i <= 2; i++) {
          const s = await addHighRiskStudent(grade, section, i);
          if (s) addedCount += 1;
        }
      }
    }

    console.log("Seed completed successfully");
    console.log(`Students ensured: ${students.length + addedCount}`);
    console.log(`Marks records ensured: ${marksCount + addedCount}`);
    console.log(`Attendance records ensured: ${attendanceCount + addedCount * weekdays.length}`);
    console.log(`Holiday records ensured: ${holidayEntries.length}`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
