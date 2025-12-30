import express from "express";
import {
  getTeacherStudents,
  markAttendance,
  getClassAttendance,
  getStudentAttendance,
  markStudentAttendance,
} from "../controllers/attendanceController.js";
import { protect } from "../middleware/authMiddleware.js"; // JWT protection

const router = express.Router();

router.get("/teacher-students", protect, getTeacherStudents);
router.post("/mark", protect, markAttendance);
router.get("/class", protect, getClassAttendance);
router.get("/student", protect, getStudentAttendance);
router.post("/mark-student", protect, markStudentAttendance);

export default router;
