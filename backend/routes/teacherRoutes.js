import express from "express";
import {
  addTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  getFilteredTeachers,
  getCurrentTeacher,
  updateCurrentTeacher,
} from "../controllers/teacherController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", addTeacher);
router.get("/", getTeachers);
router.get("/filter/:type", getFilteredTeachers); // ✅ keep type param here

// Protected routes for current teacher
router.get("/me", protect, getCurrentTeacher);
router.put("/me", protect, updateCurrentTeacher);

router.get("/:id", getTeacherById);
router.put("/:id", updateTeacher);

export default router;
