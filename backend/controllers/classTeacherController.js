import ClassTeacher from "../models/ClassTeacher.js";
import Teacher from "../models/teacherModel.js";
import User from "../models/User.js";

/**
 * ➕ Assign a teacher to a class
 */
export const assignClassTeacher = async (req, res) => {
  try {
    const { grade, section, stream, teacherId } = req.body;

    if (!grade || !section || !teacherId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const teacher = await Teacher.findById(teacherId);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Check for existing assignment
    const existing = await ClassTeacher.findOne({ grade, section, stream });
    if (existing) {
      return res.status(400).json({ message: "Class already has an assigned teacher" });
    }

    const newAssignment = new ClassTeacher({ grade, section, stream, teacherId });
    await newAssignment.save();

    res.status(201).json({
      message: "Teacher assigned successfully!",
      assignment: newAssignment,
    });
  } catch (err) {
    console.error("❌ Error assigning class teacher:", err.message);
    res.status(500).json({ message: "Failed to assign teacher" });
  }
};

/**
 * 🔹 Get assigned class for logged-in teacher
 */
export const getMyAssignedClass = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("🔹 [DEBUG] getMyAssignedClass - User ID:", userId);
    
    const user = await User.findById(userId);
    if (!user || user.role !== "teacher") {
      console.log("❌ [DEBUG] User not found or not a teacher");
      return res.status(403).json({ message: "Not authorized as teacher" });
    }

    console.log("🔹 [DEBUG] User found, userId:", user.userId);
    console.log("🔹 [DEBUG] User details:", {
      username: user.username,
      role: user.role,
      userId: user.userId,
      userIdType: typeof user.userId
    });
    
    // Check if userId is valid
    if (!user.userId) {
      console.log("❌ [DEBUG] User has no userId field set");
      return res.status(400).json({ 
        message: "Your account is not properly linked to a teacher profile. Please contact administrator to fix this.",
        error: "MISSING_USER_ID",
        user: {
          username: user.username,
          role: user.role
        }
      });
    }
    
    const teacher = await Teacher.findById(user.userId);
    if (!teacher) {
      console.log("❌ [DEBUG] Teacher profile not found for userId:", user.userId);
      
      // Check if any teachers exist
      const allTeachers = await Teacher.find({});
      console.log("🔹 [DEBUG] Total teachers in DB:", allTeachers.length);
      console.log("🔹 [DEBUG] Teacher IDs in DB:", allTeachers.map(t => t._id.toString()));
      console.log("🔹 [DEBUG] Looking for:", user.userId.toString());
      
      // Try to find teacher by username (in case we can match it)
      const teachersWithUsername = allTeachers.filter(t => 
        t.firstName?.toLowerCase().includes(user.username.toLowerCase()) ||
        t.lastName?.toLowerCase().includes(user.username.toLowerCase())
      );
      
      return res.status(404).json({ 
        message: "Teacher profile not found. Your login account exists but the teacher profile is missing.",
        error: "TEACHER_PROFILE_MISSING",
        details: {
          userUserId: user.userId?.toString(),
          username: user.username,
          totalTeachers: allTeachers.length,
          possibleMatches: teachersWithUsername.length > 0 ? teachersWithUsername.map(t => ({
            id: t._id.toString(),
            name: `${t.firstName} ${t.lastName}`
          })) : [],
          suggestion: "The teacher profile may have been deleted. Admin needs to: 1) Recreate the teacher profile, 2) Update the User document's userId field to point to the correct Teacher ID, OR 3) Delete and recreate your login account."
        }
      });
    }

    console.log("🔹 [DEBUG] Teacher found:", teacher._id);
    console.log("🔹 [DEBUG] Searching for assignment with teacherId:", teacher._id);
    
    // Check all assignments to debug
    const allAssignments = await ClassTeacher.find({});
    console.log("🔹 [DEBUG] All assignments in DB:", allAssignments.map(a => ({
      id: a._id,
      teacherId: a.teacherId,
      grade: a.grade,
      section: a.section,
      match: a.teacherId.toString() === teacher._id.toString()
    })));

    const assignment = await ClassTeacher.findOne({ teacherId: teacher._id })
      .populate("teacherId", "firstName lastName subjects");
    
    console.log("🔹 [DEBUG] Assignment found:", !!assignment);

    if (!assignment) {
      // Return 200 with assignment: null instead of 404, so frontend can handle it gracefully
      return res.status(200).json({
        message: "You are not assigned to any class yet",
        assignment: null,
        teacher: {
          name: `${teacher.firstName} ${teacher.lastName}`,
          subjects: teacher.subjects,
          teacherId: teacher._id
        }
      });
    }

    res.json({
      message: "Class assignment found",
      assignment: assignment,
      teacher: {
        name: `${teacher.firstName} ${teacher.lastName}`,
        subjects: teacher.subjects,
        teacherId: teacher._id
      }
    });
  } catch (err) {
    console.error("❌ Error fetching assigned class:", err.message);
    res.status(500).json({ message: "Failed to fetch assigned class" });
  }
};

/**
 * 📋 Get all class teacher assignments
 */
export const getAllClassTeachers = async (req, res) => {
  try {
    const assignments = await ClassTeacher.find()
      .populate("teacherId", "firstName lastName subjects");
    res.json(assignments);
  } catch (err) {
    console.error("❌ Error fetching assignments:", err.message);
    res.status(500).json({ message: "Failed to fetch class teachers" });
  }
};

/**
 * ❌ Unassign a teacher
 */
export const unassignClassTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await ClassTeacher.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Assignment not found" });

    res.json({ message: "Unassigned successfully" });
  } catch (err) {
    console.error("❌ Error unassigning teacher:", err.message);
    res.status(500).json({ message: "Failed to unassign teacher" });
  }
};

/**
 * 🔍 Get a specific class teacher by grade/section/stream
 * GET /api/class-teachers?grade=8&section=A&stream=
 */
export const getClassTeacher = async (req, res) => {
  try {
    let { grade, section, stream } = req.query;

    if (!grade || !section) {
      return res.status(400).json({ message: "Grade and section are required" });
    }

    // Convert grade to Number if stored as number
    grade = Number(grade);

    const query = { grade, section };
    if (stream) query.stream = stream;

    const assignment = await ClassTeacher.findOne(query)
      .populate("teacherId", "firstName lastName subjects");

    if (!assignment) {
      return res.status(404).json({ message: "No teacher assigned for this class" });
    }

    res.json(assignment);
  } catch (err) {
    console.error("❌ Error fetching class teacher:", err.message);
    res.status(500).json({ message: "Failed to fetch class teacher" });
  }
};
