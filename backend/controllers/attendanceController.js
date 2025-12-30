// controllers/attendanceController.js
import Attendance from "../models/Attendance.js";
import ClassTeacher from "../models/ClassTeacher.js";
import Student from "../models/studentModel.js";
import User from "../models/User.js";
import Teacher from "../models/teacherModel.js";
import SchoolDay from "../models/SchoolDay.js";

/**
 * 🔹 Get students of the logged-in teacher's class - FIXED VERSION
 */
export const getTeacherStudents = async (req, res) => {
  try {
    console.log("🔹 [DEBUG] Getting teacher students for user:", req.user.id);
    
    const userId = req.user.id;
    
    // 1. Find the user document
    const user = await User.findById(userId);
    if (!user || user.role !== "teacher") {
      console.log("❌ [DEBUG] User not found or not a teacher");
      return res.status(403).json({ message: "Not authorized as teacher" });
    }
    
    // 2. Find the teacher profile
    const teacher = await Teacher.findById(user.userId);
    if (!teacher) {
      console.log("❌ [DEBUG] Teacher profile not found");
      return res.status(404).json({ message: "Teacher profile not found" });
    }
    
    // 3. Find the teacher's assigned class
    const classAssignment = await ClassTeacher.findOne({ teacherId: teacher._id });
    if (!classAssignment) {
      console.log("❌ [DEBUG] No class assignment found for teacher");
      console.log("❌ [DEBUG] Teacher ID:", teacher._id);
      console.log("❌ [DEBUG] All assignments:", await ClassTeacher.find({}));
      return res.status(200).json({ 
        message: "You are not assigned to any class.",
        students: [],
        classInfo: null
      });
    }

    const { grade, section, stream } = classAssignment;
    console.log("🔹 [DEBUG] Class assignment found:", { grade, section, stream });
    console.log("🔹 [DEBUG] Grade type:", typeof grade, "Value:", grade);

    // 4. Find all students in that class
    // Student model stores grade as String "Grade 8", ClassTeacher stores as Number
    const gradeString = `Grade ${grade}`;
    const query = { grade: gradeString, section };
    if (stream) query.stream = stream;

    console.log("🔹 [DEBUG] Query for students:", JSON.stringify(query, null, 2));
    
    // Also check what students exist in database
    const allStudents = await Student.find({});
    console.log("🔹 [DEBUG] Total students in DB:", allStudents.length);
    console.log("🔹 [DEBUG] Sample student grades:", allStudents.slice(0, 3).map(s => ({ 
      id: s._id, 
      grade: s.grade, 
      section: s.section,
      gradeType: typeof s.grade 
    })));

    const students = await Student.find(query);
    console.log("🔹 [DEBUG] Found students:", students.length);
    if (students.length === 0) {
      console.log("⚠️ [DEBUG] No students found! Checking if query is correct...");
      // Try alternative queries
      const altQuery1 = { grade: grade, section };
      const altQuery2 = { grade: String(grade), section };
      console.log("🔹 [DEBUG] Trying alternative query 1 (number):", await Student.find(altQuery1).countDocuments());
      console.log("🔹 [DEBUG] Trying alternative query 2 (string number):", await Student.find(altQuery2).countDocuments());
    }
    
    res.json({ 
      students, 
      classInfo: classAssignment,
      teacherName: `${teacher.firstName} ${teacher.lastName}`
    });

  } catch (err) {
    console.error("❌ Error fetching teacher students:", err.message);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

/**
 * 🔹 Mark attendance for students - FIXED VERSION
 */
export const markAttendance = async (req, res) => {
  try {
    console.log("🔹 [DEBUG] Marking attendance for user:", req.user.id);
    
    const userId = req.user.id;
    const { records, date } = req.body;

    if (!date || !records)
      return res.status(400).json({ message: "Missing attendance data." });

    // 1. Get teacher document
    const user = await User.findById(userId);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Not authorized as teacher" });
    }

    const teacher = await Teacher.findById(user.userId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    // 2. Verify teacher's class assignment
    const classAssignment = await ClassTeacher.findOne({ teacherId: teacher._id });
    if (!classAssignment)
      return res.status(403).json({ message: "Not authorized to mark attendance." });

    const updates = [];

    for (const [studentId, status] of Object.entries(records)) {
      updates.push(
        Attendance.findOneAndUpdate(
          { studentId, date },
          { 
            status, 
            teacherId: teacher._id
          },
          { upsert: true, new: true }
        )
      );
    }

    await Promise.all(updates);

    res.json({ message: "Attendance saved successfully!" });
  } catch (err) {
    console.error("❌ Error marking attendance:", err.message);
    res.status(500).json({ message: "Failed to save attendance" });
  }
};

/**
 * 🔹 Get attendance records for the teacher's class - FIXED VERSION
 * Also allows admin to access all attendance
 */
export const getClassAttendance = async (req, res) => {
  try {
    console.log("🔹 [DEBUG] Getting class attendance for user:", req.user.id);
    
    const userId = req.user.id;
    const { from, to, studentId } = req.query;

    // 1. Get user document
    const user = await User.findById(userId);
    if (!user) {
      return res.status(403).json({ message: "User not found" });
    }

    // If admin and studentId is provided, return attendance for that student
    if (user.role === "admin" && studentId) {
      const dateFilter = {};
      if (from && to) {
        dateFilter.date = { $gte: from, $lte: to };
      }
      const attendance = await Attendance.find({
        studentId,
        ...dateFilter,
      }).sort({ date: -1 });
      return res.json({ attendance });
    }

    // If admin without studentId, return all attendance (with date filter)
    if (user.role === "admin") {
      const dateFilter = {};
      if (from && to) {
        dateFilter.date = { $gte: from, $lte: to };
      }
      const attendance = await Attendance.find(dateFilter)
        .populate("studentId", "firstName lastName enrollmentNo grade section")
        .sort({ date: -1 });
      return res.json({ attendance });
    }

    // For teachers, continue with existing logic
    if (user.role !== "teacher") {
      return res.status(403).json({ message: "Not authorized as teacher" });
    }

    const teacher = await Teacher.findById(user.userId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    // 2. Get teacher's class assignment
    const classAssignment = await ClassTeacher.findOne({ teacherId: teacher._id });
    if (!classAssignment)
      return res.status(403).json({ message: "You are not assigned to any class." });

    const { grade, section, stream } = classAssignment;

    // 3. Find students in that class
    // Student model stores grade as String "Grade 8", ClassTeacher stores as Number
    const gradeString = `Grade ${grade}`;
    const query = { grade: gradeString, section };
    if (stream) query.stream = stream;

    const students = await Student.find(query);
    const studentIds = students.map((s) => s._id);

    const dateFilter = {};
    if (from && to) {
      dateFilter.date = { $gte: from, $lte: to };
    }

    const attendance = await Attendance.find({
      studentId: { $in: studentIds },
      ...dateFilter,
    });

    res.json({ 
      attendance, 
      students,
      classInfo: classAssignment
    });
  } catch (err) {
    console.error("❌ Error fetching attendance:", err.message);
    res.status(500).json({ message: "Failed to load attendance" });
  }
};

/**
 * 🔹 Get attendance records for logged-in student
 */
export const getStudentAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { from, to } = req.query;

    // 1. Get user document
    const user = await User.findById(userId);
    if (!user || user.role !== "student") {
      return res.status(403).json({ message: "Not authorized as student" });
    }

    // 2. Get student profile
    const student = await Student.findById(user.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    // 3. Find attendance records for this student
    const dateFilter = {};
    if (from && to) {
      dateFilter.date = { $gte: from, $lte: to };
    }

    const attendance = await Attendance.find({
      studentId: student._id,
      ...dateFilter,
    }).sort({ date: -1 });

    // 4. Fetch school days (holidays) for the same period
    let schoolDays = [];
    if (from && to) {
      schoolDays = await SchoolDay.find({
        date: { $gte: from, $lte: to },
      });
    } else {
      // If no date range specified, fetch for current year
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;
      schoolDays = await SchoolDay.find({
        date: { $gte: yearStart, $lte: yearEnd },
      });
    }

    res.json({
      attendance,
      schoolDays,
      student: {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        enrollmentNo: student.enrollmentNo,
        grade: student.grade,
        section: student.section,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching student attendance:", err.message);
    res.status(500).json({ message: "Failed to load attendance" });
  }
};

/**
 * 🔹 Student marks their own attendance
 */
export const markStudentAttendance = async (req, res) => {
  try {
    console.log("🔹 [DEBUG] Student marking own attendance for user:", req.user.id);
    
    const userId = req.user.id;
    const { date, status } = req.body;

    if (!date || !status) {
      return res.status(400).json({ message: "Missing date or status." });
    }

    if (!["P", "A", "L"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be P, A, or L." });
    }

    // 1. Get user document
    const user = await User.findById(userId);
    if (!user || user.role !== "student") {
      return res.status(403).json({ message: "Not authorized as student" });
    }

    // 2. Get student profile
    const student = await Student.findById(user.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    // 3. Get the student's class teacher to associate with attendance
    const gradeString = `Grade ${student.grade}`;
    const classAssignment = await ClassTeacher.findOne({
      grade: student.grade,
      section: student.section,
    });

    if (!classAssignment) {
      return res.status(400).json({ message: "No class teacher assigned for this class." });
    }

    // 4. Update or create attendance record
    const attendance = await Attendance.findOneAndUpdate(
      { studentId: student._id, date },
      {
        status,
        teacherId: classAssignment.teacherId,
      },
      { upsert: true, new: true }
    );

    console.log("✅ [DEBUG] Student attendance marked successfully:", attendance);

    res.json({
      message: "Your attendance has been marked successfully!",
      attendance,
    });
  } catch (err) {
    console.error("❌ Error marking student attendance:", err.message);
    res.status(500).json({ message: "Failed to mark attendance" });
  }
};

// REMOVE ANY DUPLICATE EXPORTS BELOW THIS LINE