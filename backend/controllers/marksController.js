import Student from "../models/studentModel.js";
import Marks from "../models/Marks.js";
import User from "../models/User.js";
import { getSubjectsByGrade } from "../utils/subjectUtils.js";

// Helper to persist a single student's marks and keep student terms in sync
const upsertSingleMarks = async ({ studentId, year, term, marks }, teacherId) => {
  if (!studentId || year === undefined || term === undefined || !marks || typeof marks !== 'object' || Array.isArray(marks)) {
    throw new Error('Invalid upsert payload');
  }

  const yearNum = Number(year);
  const termNum = Number(term);
  if (isNaN(yearNum) || isNaN(termNum) || ![1,2,3].includes(termNum)) {
    throw new Error('Invalid year or term');
  }

  const student = await Student.findById(studentId);
  if (!student) {
    const ex = new Error('Student not found');
    ex.status = 404;
    throw ex;
  }

  const { gradeCategory } = getSubjectsByGrade(student.grade);
  if (gradeCategory === 'unknown') {
    const ex = new Error(`Invalid grade: ${student.grade}`);
    ex.status = 400;
    throw ex;
  }

  const cleanedMarks = {};
  Object.keys(marks).forEach(key => {
    const value = marks[key];
    if (value !== null && value !== undefined && value !== '') {
      const numValue = Number(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        cleanedMarks[key] = numValue;
      }
    }
  });

  if (Object.keys(cleanedMarks).length === 0) {
    const ex = new Error('At least one valid mark (0-100) must be provided');
    ex.status = 400;
    throw ex;
  }

  let marksRecord = await Marks.findOne({ studentId, year: yearNum, term: termNum });
  if (marksRecord) {
    marksRecord.marks = cleanedMarks;
    marksRecord.gradeLevel = gradeCategory;
    await marksRecord.save();
  } else {
    marksRecord = new Marks({ studentId, teacherId, year: yearNum, term: termNum, marks: cleanedMarks, gradeLevel: gradeCategory });
    await marksRecord.save();
  }

  if (!student.terms) student.terms = [];
  const existingTerm = student.terms.find(t => t.year === yearNum && t.term === termNum);
  if (existingTerm) {
    existingTerm.marks = cleanedMarks;
  } else {
    student.terms.push({ year: yearNum, term: termNum, marks: cleanedMarks });
  }
  await student.save();

  return marksRecord;
};

// ➕ Add or update marks for a student
export const upsertMarks = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    const teacherId = req.user.id;
    const { studentId, year, term, marks } = req.body;

    const marksRecord = await upsertSingleMarks({ studentId, year, term, marks }, teacherId);

    return res.status(200).json({ message: 'Marks saved successfully', marks: marksRecord });
  } catch (err) {
    console.error('Error in upsertMarks:', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Server error', error: err.stack });
  }
};

// Bulk upsert for teacher marks page
export const upsertMarksBulk = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not authenticated' });
    }

    const teacherId = req.user.id;
    const updates = req.body.updates;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ message: 'updates must be a non-empty array' });
    }

    const results = [];
    for (const update of updates) {
      try {
        const saved = await upsertSingleMarks(update, teacherId);
        results.push({ studentId: update.studentId, success: true, marks: saved });
      } catch (err) {
        results.push({ studentId: update.studentId, success: false, message: err.message });
      }
    }

    res.status(200).json({ message: 'Bulk upsert complete', results });
  } catch (err) {
    console.error('Error in upsertMarksBulk:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


// 📋 Get marks of a student with subject info
// Works for admin, teacher, and student roles
export const getStudentMarks = async (req, res) => {
  try {
    const { studentId, year, term } = req.query;
    
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }
    
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Build query
    let query = { studentId };
    if (year) query.year = Number(year);
    if (term) query.term = Number(term);

    const marksRecords = await Marks.find(query)
      .populate("teacherId", "firstName lastName")
      .sort({ year: -1, term: -1 });

    const subjectsInfo = getSubjectsByGrade(student.grade);

    res.json({
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        enrollmentNo: student.enrollmentNo,
        grade: student.grade,
      },
      subjectCategory: subjectsInfo.gradeCategory,
      subjects: subjectsInfo.subjects,
      marks: marksRecords,
    });
  } catch (err) {
    console.error("Error in getStudentMarks:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 📋 Get all students' marks for a teacher's class (teacher view)
export const getTeacherClassMarks = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const { year, term } = req.query;

    // Get all marks records for this teacher
    let query = { teacherId };
    if (year) query.year = Number(year);
    if (term) query.term = Number(term);

    const marksRecords = await Marks.find(query)
      .populate("studentId", "firstName lastName enrollmentNo grade")
      .populate("teacherId", "firstName lastName");

    // Group by student grade
    const groupedByGrade = {};
    marksRecords.forEach(record => {
      if (!record.studentId || !record.studentId.grade) return;
      
      const gradeStr = String(record.studentId.grade);
      const match = gradeStr.match(/\d+/);
      const gradeNum = match ? parseInt(match[0]) : null;
      
      if (!gradeNum || isNaN(gradeNum)) return;
      
      let gradeKey;
      if (gradeNum >= 1 && gradeNum <= 5) gradeKey = "Grade 1-5";
      else if (gradeNum >= 6 && gradeNum <= 9) gradeKey = "Grade 6-9";
      else if (gradeNum >= 10 && gradeNum <= 11) gradeKey = "Grade 10-11";
      else gradeKey = `Grade ${gradeNum}`;

      if (!groupedByGrade[gradeKey]) {
        groupedByGrade[gradeKey] = {
          subjectsInfo: getSubjectsByGrade(record.studentId.grade),
          marks: [],
        };
      }
      groupedByGrade[gradeKey].marks.push(record);
    });

    res.json(groupedByGrade);
  } catch (err) {
    console.error("Error in getTeacherClassMarks:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 📋 Get all students' marks (admin view)
export const getAllStudentsMarks = async (req, res) => {
  try {
    const { year, term } = req.query;
    const marks = await Marks.find()
      .populate("studentId", "firstName lastName enrollmentNo grade")
      .populate("teacherId", "firstName lastName");

    let filtered = marks;
    if (year) filtered = filtered.filter(m => m.year === Number(year));
    if (term) filtered = filtered.filter(m => m.term === Number(term));

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// 📋 Get current student's marks (for authenticated student)
export const getCurrentStudentMarks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user and find associated student
    const user = await User.findById(userId);
    if (!user || user.role !== "student") {
      return res.status(403).json({ message: "Not authorized as student" });
    }
    
    const student = await Student.findById(user.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }
    
    const marksRecords = await Marks.find({ studentId: student._id })
      .populate("teacherId", "firstName lastName")
      .sort({ year: -1, term: -1 });
    
    const subjectsInfo = getSubjectsByGrade(student.grade);
    
    res.json({
      student: {
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        enrollmentNo: student.enrollmentNo,
        grade: student.grade,
      },
      subjectCategory: subjectsInfo.gradeCategory,
      subjects: subjectsInfo.subjects,
      marks: marksRecords,
    });
  } catch (err) {
    console.error("Error in getCurrentStudentMarks:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
