import express from "express";
import { upsertMarks, upsertMarksBulk, getStudentMarks, getAllStudentsMarks, getTeacherClassMarks, getCurrentStudentMarks } from "../controllers/marksController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Teachers can add/update marks (protected)
router.post("/upsert", protect, upsertMarks);
router.post("/bulk-upsert", protect, upsertMarksBulk);

// Get teacher's class marks (protected - for teachers) - MUST come before /student
router.get("/teacher-class", protect, getTeacherClassMarks);

// Get single student marks (for student view - protected)
router.get("/student", protect, getStudentMarks);

// Get current logged-in student's marks
router.get("/my-marks", protect, getCurrentStudentMarks);
// Admin: get all students (protected)
router.get("/all", protect, getAllStudentsMarks);

export default router;
