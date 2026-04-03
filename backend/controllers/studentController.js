import Student from "../models/studentModel.js";
import User from "../models/User.js";

/**
 * Helper: Parse grade from string or number
 * "Grade 8" | "8" | 8 → 8
 */
const parseGrade = (grade) => {
  if (typeof grade === "string") {
    const match = grade.match(/\d+/);
    return match ? Number(match[0]) : null;
  }
  return Number(grade);
};

/**
 * ✅ Create student
 */
export const createStudent = async (req, res) => {
  try {
    const studentData = { ...req.body };

    if (studentData.grade) {
      studentData.grade = `Grade ${parseGrade(studentData.grade)}`;
    }

    const student = await Student.create(studentData);

    if (studentData.username && studentData.password) {
      await User.create({
        username: studentData.username,
        password: studentData.password,
        role: "student",
        userId: student._id,
      });
    }

    res.status(201).json(student);
  } catch (error) {
    console.error("❌ createStudent:", error.message);
    res.status(400).json({ message: error.message });
  }
};

/**
 * ✅ Get logged-in student profile
 */
export const getMyStudentProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || user.role !== "student") {
      return res.status(403).json({ message: "Not authorized as student" });
    }

    const student = await Student.findById(user.userId);
    if (!student) {
      return res.status(404).json({ message: "Student profile not found" });
    }

    res.json(student);
  } catch (error) {
    console.error("❌ getMyStudentProfile:", error.message);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

/**
 * ✅ Get students by class (teacher dashboard)
 */
export const getStudentsByClass = async (req, res) => {
  try {
    let { grade, section, stream } = req.query;

    if (!grade || !section) {
      return res.status(400).json({ message: "Grade and section required" });
    }

    grade = `Grade ${parseGrade(grade)}`;
    const query = { grade, section };
    if (stream) query.stream = stream;

    const students = await Student.find(query);
    res.json({ count: students.length, students });
  } catch (error) {
    console.error("❌ getStudentsByClass:", error.message);
    res.status(500).json({ message: "Failed to fetch students" });
  }
};

/**
 * ✅ Get all students
 */
export const getStudents = async (req, res) => {
  const students = await Student.find();
  res.json(students);
};

/**
 * ✅ Get single student
 */
export const getStudentById = async (req, res) => {
  const student = await Student.findById(req.params.id);
  if (!student) return res.status(404).json({ message: "Student not found" });
  res.json(student);
};

/**
 * ✅ Update student (with password sync)
 */
export const updateStudent = async (req, res) => {
  try {
    const { username, password, ...studentData } = req.body;
    
    if (studentData.grade) {
      studentData.grade = `Grade ${parseGrade(studentData.grade)}`;
    }

    // Update student profile
    const student = await Student.findByIdAndUpdate(req.params.id, studentData, { new: true });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // Sync password to User if provided
    if (username && password) {
      const { updateUserPassword } = await import('./authController.js');
      await updateUserPassword(username, password);
    }

    res.json(student);
  } catch (error) {
    console.error("❌ updateStudent:", error.message);
    res.status(500).json({ message: error.message });
  }
};


/**
 * ✅ Auto-update student classes based on year
 * Increases grade by 1 for all active students after one year
 * Checks enrollment date or last academic year to determine promotion
 */
export const autoUpdateClasses = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    const currentDate = new Date();
    
    // Get all active students (not leaved)
    const students = await Student.find({ leaveDate: { $exists: false } });
    
    let updated = 0;
    let skipped = 0;
    let errors = [];

    for (const student of students) {
      try {
        // Parse current grade
        const currentGradeNum = parseGrade(student.grade);
        if (!currentGradeNum || currentGradeNum >= 13) {
          // Skip if grade is invalid or already at max (Grade 13)
          skipped++;
          continue;
        }

        // Check if student has been enrolled for at least one year
        // Use enrollment date if available, otherwise check if it's a new academic year
        let shouldPromote = false;
        
        if (student.enrollmentDate) {
          const enrollmentDate = new Date(student.enrollmentDate);
          const yearsSinceEnrollment = currentDate.getFullYear() - enrollmentDate.getFullYear();
          const monthsSinceEnrollment = (currentDate.getFullYear() - enrollmentDate.getFullYear()) * 12 + 
                                       (currentDate.getMonth() - enrollmentDate.getMonth());
          
          // Promote if enrolled for at least 12 months
          if (monthsSinceEnrollment >= 12) {
            shouldPromote = true;
          }
        } else {
          // If no enrollment date, promote based on academic year (typically January)
          // This is a fallback - ideally all students should have enrollment dates
          if (currentDate.getMonth() === 0) { // January - start of new academic year
            shouldPromote = true;
          }
        }

        if (shouldPromote) {
          const newGradeNum = currentGradeNum + 1;
          const newGrade = `Grade ${newGradeNum}`;

          // Update student grade
          student.grade = newGrade;
          await student.save();
          updated++;
        } else {
          skipped++;
        }
      } catch (err) {
        errors.push({ studentId: student._id, error: err.message });
      }
    }

    res.json({
      message: `Class update completed. ${updated} students promoted, ${skipped} skipped.`,
      updated,
      skipped,
      total: students.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ autoUpdateClasses:", error.message);
    res.status(500).json({ message: "Failed to update classes", error: error.message });
  }
};

/**
 * ✅ Delete student
 */
export const deleteStudent = async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ message: "Student not found" });

  await User.deleteOne({ userId: student._id, role: "student" });
  res.json({ message: "Student deleted successfully" });
};
