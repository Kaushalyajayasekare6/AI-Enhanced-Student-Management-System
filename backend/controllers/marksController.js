import Student from "../models/studentModel.js";
import Marks from "../models/Marks.js";
import User from "../models/User.js";
import { getSubjectsByGrade } from "../utils/subjectUtils.js";

// ➕ Add or update marks for a student
export const upsertMarks = async (req, res) => {
  try {
    const { studentId, year, term, marks } = req.body;
    
    // Validate authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }
    
    const teacherId = req.user.id;

    // Validate required fields
    if (!studentId || year === undefined || year === null || term === undefined || term === null) {
      return res.status(400).json({ 
        message: "Missing required fields: studentId, year, or term",
        received: { studentId: !!studentId, year, term }
      });
    }

    // Validate marks object
    if (!marks || typeof marks !== "object" || Array.isArray(marks)) {
      return res.status(400).json({ message: "Marks must be an object" });
    }

    // Convert year and term to numbers
    const yearNum = Number(year);
    const termNum = Number(term);
    
    if (isNaN(yearNum) || isNaN(termNum)) {
      return res.status(400).json({ message: "Year and term must be valid numbers" });
    }
    
    if (![1, 2, 3].includes(termNum)) {
      return res.status(400).json({ message: "Term must be 1, 2, or 3" });
    }

    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get grade category based on student grade
    const { gradeCategory } = getSubjectsByGrade(student.grade);

    // Validate grade category
    if (gradeCategory === "unknown") {
      return res.status(400).json({ 
        message: `Invalid grade: ${student.grade}. Grade must be between 1-11.` 
      });
    }

    // Clean marks object - remove null/undefined/empty values and ensure valid numbers
    const cleanedMarks = {};
    Object.keys(marks).forEach(key => {
      const value = marks[key];
      // Only include valid numeric values between 0-100
      if (value !== null && value !== undefined && value !== "") {
        const numValue = Number(value);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
          cleanedMarks[key] = numValue;
        }
      }
    });
    
    // Ensure at least one mark is provided
    if (Object.keys(cleanedMarks).length === 0) {
      return res.status(400).json({ 
        message: "At least one valid mark (0-100) must be provided" 
      });
    }

    // Find and update or create marks record
    let marksRecord = await Marks.findOne({ 
      studentId, 
      year: yearNum, 
      term: termNum 
    });

    try {
      if (marksRecord) {
        // Update existing record
        marksRecord.marks = cleanedMarks;
        marksRecord.gradeLevel = gradeCategory;
        await marksRecord.save();
      } else {
        // Create new record
        marksRecord = new Marks({
          studentId,
          teacherId,
          year: yearNum,
          term: termNum,
          marks: cleanedMarks,
          gradeLevel: gradeCategory,
        });
        await marksRecord.save();
      }
    } catch (saveError) {
      console.error("Error saving marks record:", saveError);
      // Check if it's a validation error
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({ 
          message: "Validation error", 
          error: saveError.message,
          details: Object.keys(saveError.errors || {}).map(key => ({
            field: key,
            message: saveError.errors[key].message
          }))
        });
      }
      throw saveError; // Re-throw to be caught by outer catch
    }

    // Also update student model for backward compatibility
    try {
      if (!student.terms) {
        student.terms = [];
      }
      const existingTerm = student.terms.find(t => t.year === yearNum && t.term === termNum);
      if (existingTerm) {
        existingTerm.marks = cleanedMarks;
      } else {
        student.terms.push({ year: yearNum, term: termNum, marks: cleanedMarks });
      }
      await student.save();
    } catch (studentSaveError) {
      console.error("Error updating student terms:", studentSaveError);
      // Don't fail the request if student update fails, but log it
    }

    res.status(200).json({ message: "Marks saved successfully", marks: marksRecord });
  } catch (err) {
    console.error("Error in upsertMarks:", err);
    // Log full error details for debugging
    console.error("Error stack:", err.stack);
    console.error("Error details:", {
      studentId: req.body?.studentId,
      year: req.body?.year,
      term: req.body?.term,
      marksKeys: req.body?.marks ? Object.keys(req.body.marks) : [],
    });
    res.status(500).json({ 
      message: "Server error", 
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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
