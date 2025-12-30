import express from "express";
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  getStudentsByClass,
  getMyStudentProfile,
  autoUpdateClasses
} from "../controllers/studentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔐 Student profile
router.get("/me", protect, getMyStudentProfile);

// 👨‍🏫 Teacher dashboard
router.get("/by-class", protect, getStudentsByClass);

// CRUD
router.post("/", protect, createStudent);
router.get("/", protect, getStudents);
router.get("/:id", protect, getStudentById);
router.put("/:id", protect, updateStudent);
router.delete("/:id", protect, deleteStudent);

// Auto-update classes (admin only - can be called annually)
router.post("/auto-update-classes", protect, autoUpdateClasses);

export default router;
