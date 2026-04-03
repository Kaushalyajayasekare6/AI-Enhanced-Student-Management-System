import Teacher from "../models/teacherModel.js";
import { registerUser } from "./authController.js";

// ➕ Add teacher (and auto-create login user)
export const addTeacher = async (req, res) => {
  try {
    const { username, password, ...teacherData } = req.body;

    // Save teacher profile
    const teacher = new Teacher(teacherData);
    const saved = await teacher.save();

    // Auto-register login account if credentials provided
    if (username && password) {
      await registerUser(username, password, "teacher", saved._id);
    }

    res.status(201).json(saved);
  } catch (err) {
    console.error("❌ Error adding teacher:", err.message);
    res.status(500).json({ message: "Failed to add teacher" });
  }
};

// 📋 Get all teachers
export const getTeachers = async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 🔍 Filter teachers (supports active/leaved)
export const getFilteredTeachers = async (req, res) => {
  try {
    const { type } = req.params;
    let filters = {};

    if (type === "active") {
      filters.leaveDate = { $in: [null, "", undefined] };
    } else if (type === "leaved") {
      filters.leaveDate = { $ne: "" };
    }

    const teachers = await Teacher.find(filters);
    res.json(teachers);
  } catch (err) {
    console.error("❌ Error filtering teachers:", err.message);
    res.status(500).json({ message: "Failed to filter teachers" });
  }
};

// 👤 Get one teacher
export const getTeacherById = async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 👤 Get current teacher profile (from JWT token)
export const getCurrentTeacher = async (req, res) => {
  try {
    // req.user is set by authMiddleware from JWT token
    const userId = req.user.id; // This is the User document _id
    
    // Find user to get userId reference (which points to Teacher document)
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (user.role !== "teacher") {
      return res.status(403).json({ message: "Not authorized - not a teacher" });
    }

    // Find teacher by userId (which is the Teacher document _id)
    const teacher = await Teacher.findById(user.userId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found. Please contact admin." });
    }

    res.json(teacher);
  } catch (err) {
    console.error("❌ Error fetching current teacher:", err.message);
    res.status(500).json({ message: "Failed to fetch teacher profile" });
  }
};

// ✏️ Update current teacher profile (from JWT token)
export const updateCurrentTeacher = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const User = (await import("../models/User.js")).default;
    const user = await User.findById(userId);
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const teacher = await Teacher.findByIdAndUpdate(
      user.userId,
      req.body,
      { new: true }
    );
    if (!teacher) {
      return res.status(404).json({ message: "Teacher profile not found" });
    }

    res.json(teacher);
  } catch (err) {
    console.error("❌ Error updating teacher:", err.message);
    res.status(500).json({ message: "Failed to update teacher profile" });
  }
};

// ✏️ Update teacher (with password sync)
export const updateTeacher = async (req, res) => {
  try {
    const { username, password, ...teacherData } = req.body;
    
    // Update teacher profile
    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      teacherData,
      { new: true }
    );
    if (!teacher) return res.status(404).json({ message: "Teacher not found" });

    // Sync password to User if provided
    if (username && password) {
      const { updateUserPassword } = await import('./authController.js');
      await updateUserPassword(username, password);
    }

    res.json(teacher);
  } catch (err) {
    console.error("❌ Error updating teacher:", err.message);
    res.status(500).json({ message: err.message });
  }
};


