import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  assignClassTeacher,
  getAllClassTeachers,
  getClassTeacher,
  unassignClassTeacher,
  getMyAssignedClass
} from "../controllers/classTeacherController.js";

const router = express.Router();

// ➕ Assign teacher to class (Admin)
router.post("/", protect, assignClassTeacher);

// 📋 Get all class-teacher mappings (Admin)
router.get("/", protect, getAllClassTeachers);

// 🔍 Get one by grade/section/stream
router.get("/find", protect, getClassTeacher);

// ✅ Get logged-in teacher's assigned class (Teacher Dashboard)
router.get("/my-class", protect, getMyAssignedClass);

// ❌ Unassign teacher (Admin)
router.delete("/:id", protect, unassignClassTeacher);

export default router;
