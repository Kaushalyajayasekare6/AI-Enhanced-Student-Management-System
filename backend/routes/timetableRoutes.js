import express from "express";
import {
  generateTimetable,
  getTimetable,
  getTeacherTimetable,
  getStudentTimetable,
  deleteTimetable,
  updateTimetable,
  getAllTimetables,
  generateTimetableSuggestions,
} from "../controllers/timetableController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Generate timetable (admin only)
router.post("/generate", protect, generateTimetable);

// Get intelligent suggestions for timetable creation
router.post("/suggestions", protect, generateTimetableSuggestions);

// Get timetable for a class
router.get("/class", getTimetable);

// Get timetable for logged-in teacher
router.get("/teacher", protect, getTeacherTimetable);

// Get timetable for logged-in student
router.get("/student", protect, getStudentTimetable);

// Get all timetables (admin)
router.get("/all", protect, getAllTimetables);

// Update timetable (admin)
router.put("/", protect, updateTimetable);

// Delete timetable
router.delete("/", protect, deleteTimetable);

export default router;



